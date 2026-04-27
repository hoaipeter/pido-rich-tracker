import type { Expense } from "@shared/expenses/schemas";
import { getMonthKey, shiftMonth } from "./format";
import { filterByMonth, totalAmount } from "./analytics";

export interface ForecastPoint {
  monthKey: string;
  /** Predicted total for the month. */
  forecast: number;
  /** Lower bound of the prediction interval (80% by default). */
  lower: number;
  /** Upper bound of the prediction interval. */
  upper: number;
}

export interface PaceForecast {
  /** End-of-month projection based on current pace + recent weighting. */
  projectedTotal: number;
  /** Average daily spend used for the projection. */
  avgPerDay: number;
  /** Days elapsed in the month at the time of projection. */
  daysElapsed: number;
  /** Total days in the projection month. */
  daysInMonth: number;
  /** Total spent so far this month. */
  spentToDate: number;
}

/**
 * Project a month's end-of-period total from the current spending pace.
 *
 * Strategy: weighted blend of (a) running pace = spent/elapsed × daysInMonth
 * and (b) trailing-7-day pace × daysInMonth. The trailing window dampens
 * early-month volatility — without it a single $300 expense on day 2 would
 * project to ~$4500. Once we have ≥7 days of data both signals weight
 * equally; before that we lean on the running pace.
 */
export function paceForecast(
  monthExpenses: Expense[],
  asOf: Date = new Date(),
): PaceForecast {
  const year = asOf.getFullYear();
  const month = asOf.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysElapsed = Math.max(1, asOf.getDate());

  const spentToDate = totalAmount(monthExpenses);
  const runningPace = spentToDate / daysElapsed;

  // Trailing 7-day window (or all elapsed days if fewer).
  const windowDays = Math.min(7, daysElapsed);
  const windowStartDay = daysElapsed - windowDays + 1;
  const windowExpenses = monthExpenses.filter((expense) => {
    const day = Number(expense.date.slice(8, 10));
    return day >= windowStartDay && day <= daysElapsed;
  });
  const windowPace = totalAmount(windowExpenses) / windowDays;

  // Confidence weight on the trailing window grows with daysElapsed up to 0.5.
  const windowWeight = Math.min(0.5, daysElapsed / 14);
  const avgPerDay = runningPace * (1 - windowWeight) + windowPace * windowWeight;

  return {
    projectedTotal: avgPerDay * daysInMonth,
    avgPerDay,
    daysElapsed,
    daysInMonth,
    spentToDate,
  };
}

/**
 * Holt-Winters additive triple-exponential smoothing for monthly totals.
 *
 * Falls back to Holt double-exponential smoothing when fewer than 24 months
 * of data are available (need 2× the seasonal period for additive seasonal
 * decomposition to be meaningful). Returns `periods` ahead forecasts with
 * 80% prediction intervals derived from in-sample residual stdev.
 *
 * This is intentionally a from-scratch pure-JS implementation — adding a
 * statistics package for one method would be overkill.
 */
export function holtWinters(
  series: number[],
  periods: number,
  options: { alpha?: number; beta?: number; gamma?: number; seasonLength?: number } = {},
): { forecast: number[]; intervals: { lower: number; upper: number }[] } {
  const seasonLength = options.seasonLength ?? 12;
  const alpha = clamp01(options.alpha ?? 0.4);
  const beta = clamp01(options.beta ?? 0.1);
  const gamma = clamp01(options.gamma ?? 0.2);

  if (series.length < 4) {
    // Not enough data — fall back to last value carry-forward.
    const last = series[series.length - 1] ?? 0;
    return {
      forecast: Array.from({ length: periods }, () => last),
      intervals: Array.from({ length: periods }, () => ({
        lower: Math.max(0, last * 0.7),
        upper: last * 1.3,
      })),
    };
  }

  const useSeasonal = series.length >= seasonLength * 2;

  if (!useSeasonal) {
    // Holt double-exponential (level + trend, no seasonality).
    let level = series[0] ?? 0;
    let trend = (series[1] ?? 0) - (series[0] ?? 0);
    const residuals: number[] = [];
    for (let i = 1; i < series.length; i += 1) {
      const value = series[i] ?? 0;
      const prevLevel = level;
      level = alpha * value + (1 - alpha) * (prevLevel + trend);
      trend = beta * (level - prevLevel) + (1 - beta) * trend;
      residuals.push(value - (prevLevel + trend));
    }
    const stdev = standardDeviation(residuals);
    const forecast: number[] = [];
    const intervals: { lower: number; upper: number }[] = [];
    for (let h = 1; h <= periods; h += 1) {
      const point = Math.max(0, level + h * trend);
      // Variance grows with horizon (~ stdev × sqrt(h)) — standard for ETS.
      const half = 1.28 * stdev * Math.sqrt(h);
      forecast.push(point);
      intervals.push({
        lower: Math.max(0, point - half),
        upper: point + half,
      });
    }
    return { forecast, intervals };
  }

  // Seasonal Holt-Winters (additive).
  // Initialize seasonals from the average of seasonal periods.
  const seasonals: number[] = new Array(seasonLength).fill(0);
  const cycleCount = Math.floor(series.length / seasonLength);
  const cycleAverages: number[] = [];
  for (let c = 0; c < cycleCount; c += 1) {
    let sum = 0;
    for (let i = 0; i < seasonLength; i += 1) {
      sum += series[c * seasonLength + i] ?? 0;
    }
    cycleAverages.push(sum / seasonLength);
  }
  for (let i = 0; i < seasonLength; i += 1) {
    let sum = 0;
    for (let c = 0; c < cycleCount; c += 1) {
      sum += (series[c * seasonLength + i] ?? 0) - (cycleAverages[c] ?? 0);
    }
    seasonals[i] = sum / cycleCount;
  }

  let level = cycleAverages[0] ?? 0;
  let trend =
    ((cycleAverages[1] ?? cycleAverages[0] ?? 0) - (cycleAverages[0] ?? 0)) /
    seasonLength;

  const residuals: number[] = [];
  for (let i = 0; i < series.length; i += 1) {
    const value = series[i] ?? 0;
    const seasonal = seasonals[i % seasonLength] ?? 0;
    const prevLevel = level;
    level = alpha * (value - seasonal) + (1 - alpha) * (prevLevel + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
    seasonals[i % seasonLength] = gamma * (value - level) + (1 - gamma) * seasonal;
    residuals.push(value - (prevLevel + trend + seasonal));
  }
  const stdev = standardDeviation(residuals);

  const forecast: number[] = [];
  const intervals: { lower: number; upper: number }[] = [];
  for (let h = 1; h <= periods; h += 1) {
    const seasonal = seasonals[(series.length + h - 1) % seasonLength] ?? 0;
    const point = Math.max(0, level + h * trend + seasonal);
    const half = 1.28 * stdev * Math.sqrt(h);
    forecast.push(point);
    intervals.push({
      lower: Math.max(0, point - half),
      upper: point + half,
    });
  }
  return { forecast, intervals };
}

/**
 * Per-category forecast for the next `horizon` months. Internally builds a
 * monthly series per category by walking history from the earliest expense
 * forward and runs `holtWinters` on each. Returns category-keyed forecast
 * points anchored on yyyy-mm month keys.
 */
export function forecastByCategory(
  expenses: Expense[],
  endMonthKey: string,
  horizon = 1,
  historyMonths = 24,
): Record<string, ForecastPoint[]> {
  const categories = new Set(expenses.map((expense) => expense.category));
  const result: Record<string, ForecastPoint[]> = {};

  // Build the monthly series from `endMonthKey - historyMonths + 1` ..
  // `endMonthKey` per category, then forecast `horizon` months ahead.
  for (const category of categories) {
    const series: number[] = [];
    for (let i = historyMonths - 1; i >= 0; i -= 1) {
      const monthKey = shiftMonth(endMonthKey, -i);
      const monthExpenses = filterByMonth(expenses, monthKey).filter(
        (expense) => expense.category === category,
      );
      series.push(totalAmount(monthExpenses));
    }
    const { forecast, intervals } = holtWinters(series, horizon);
    result[category] = forecast.map((value, index) => ({
      monthKey: shiftMonth(endMonthKey, index + 1),
      forecast: value,
      lower: intervals[index]?.lower ?? value,
      upper: intervals[index]?.upper ?? value,
    }));
  }

  return result;
}

/**
 * Total-spending forecast across all categories (single combined series).
 * Faster + more stable than summing per-category forecasts when categories
 * are sparse.
 */
export function forecastTotal(
  expenses: Expense[],
  endMonthKey: string,
  horizon = 2,
  historyMonths = 24,
): ForecastPoint[] {
  const series: number[] = [];
  for (let i = historyMonths - 1; i >= 0; i -= 1) {
    const monthKey = shiftMonth(endMonthKey, -i);
    series.push(totalAmount(filterByMonth(expenses, monthKey)));
  }
  const { forecast, intervals } = holtWinters(series, horizon);
  return forecast.map((value, index) => ({
    monthKey: shiftMonth(endMonthKey, index + 1),
    forecast: value,
    lower: intervals[index]?.lower ?? value,
    upper: intervals[index]?.upper ?? value,
  }));
}

/** History month keys ending at endMonthKey, oldest first. */
export function historyMonthKeys(endMonthKey: string, count: number): string[] {
  const result: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    result.push(shiftMonth(endMonthKey, -i));
  }
  return result;
}

/** Convenience: today's monthKey. Pure helper used by view code. */
export function nowMonthKey(): string {
  return getMonthKey(new Date().toISOString().slice(0, 10));
}

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function standardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}
