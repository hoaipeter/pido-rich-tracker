import type { Expense, ExpenseCategory } from "@shared/expenses/schemas";
import { EXPENSE_CATEGORIES } from "@shared/expenses/schemas";
import { getMonthKey, monthKeysInRange, shiftMonth } from "./format";

export interface CategoryTotal {
  category: ExpenseCategory;
  amount: number;
  percent: number;
  count: number;
}

export interface MonthlyTotal {
  monthKey: string;
  total: number;
  count: number;
}

export interface DailyTotal {
  date: string;
  amount: number;
  cumulative: number;
}

export interface PeriodSummary {
  total: number;
  count: number;
  average: number;
  largest: Expense | null;
  topCategory: CategoryTotal | null;
  byCategory: CategoryTotal[];
}

export interface PeriodComparison {
  current: PeriodSummary;
  previous: PeriodSummary;
  delta: number; // current.total - previous.total
  deltaPercent: number | null; // null when previous.total === 0
}

export function totalAmount(expenses: Expense[]): number {
  return expenses.reduce((sum, expense) => sum + expense.amount, 0);
}

export function filterByMonth(expenses: Expense[], monthKey: string): Expense[] {
  return expenses.filter((expense) => getMonthKey(expense.date) === monthKey);
}

export function summarizePeriod(expenses: Expense[]): PeriodSummary {
  const total = totalAmount(expenses);
  const count = expenses.length;
  const average = count > 0 ? total / count : 0;

  const counts = new Map<ExpenseCategory, { amount: number; count: number }>();
  for (const expense of expenses) {
    const entry = counts.get(expense.category) ?? { amount: 0, count: 0 };
    entry.amount += expense.amount;
    entry.count += 1;
    counts.set(expense.category, entry);
  }

  const byCategory: CategoryTotal[] = EXPENSE_CATEGORIES.map((category) => {
    const entry = counts.get(category) ?? { amount: 0, count: 0 };
    return {
      category,
      amount: entry.amount,
      count: entry.count,
      percent: total > 0 ? (entry.amount / total) * 100 : 0,
    };
  })
    .filter((row) => row.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const largest = expenses.reduce<Expense | null>((max, expense) => {
    if (!max || expense.amount > max.amount) return expense;
    return max;
  }, null);

  return {
    total,
    count,
    average,
    largest,
    topCategory: byCategory[0] ?? null,
    byCategory,
  };
}

export function compareMonths(
  expenses: Expense[],
  currentMonthKey: string,
): PeriodComparison {
  const previousMonthKey = shiftMonth(currentMonthKey, -1);
  const current = summarizePeriod(filterByMonth(expenses, currentMonthKey));
  const previous = summarizePeriod(filterByMonth(expenses, previousMonthKey));
  const delta = current.total - previous.total;
  const deltaPercent = previous.total > 0 ? (delta / previous.total) * 100 : null;
  return { current, previous, delta, deltaPercent };
}

/** Monthly totals for the trailing N months ending at the given month. */
export function monthlyTotalsTrailing(
  expenses: Expense[],
  endMonthKey: string,
  months: number,
): MonthlyTotal[] {
  const result: MonthlyTotal[] = [];
  for (let i = months - 1; i >= 0; i -= 1) {
    const monthKey = shiftMonth(endMonthKey, -i);
    const monthExpenses = filterByMonth(expenses, monthKey);
    result.push({
      monthKey,
      total: totalAmount(monthExpenses),
      count: monthExpenses.length,
    });
  }
  return result;
}

/** Daily totals for the given month, with a cumulative running sum. */
export function dailyTotalsForMonth(expenses: Expense[], monthKey: string): DailyTotal[] {
  const monthExpenses = filterByMonth(expenses, monthKey);
  const totalsByDate = new Map<string, number>();
  for (const expense of monthExpenses) {
    totalsByDate.set(
      expense.date,
      (totalsByDate.get(expense.date) ?? 0) + expense.amount,
    );
  }

  const [year, month] = monthKey.split("-").map(Number);
  const daysInMonth = new Date(year ?? 0, month ?? 1, 0).getDate();
  const result: DailyTotal[] = [];
  let cumulative = 0;
  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateStr = `${monthKey}-${String(day).padStart(2, "0")}`;
    const amount = totalsByDate.get(dateStr) ?? 0;
    cumulative += amount;
    result.push({ date: dateStr, amount, cumulative });
  }
  return result;
}

export function listAvailableMonths(expenses: Expense[]): string[] {
  const set = new Set<string>();
  for (const expense of expenses) set.add(getMonthKey(expense.date));
  return Array.from(set).sort().reverse();
}

/** Filter helpers mirroring the server-side shape for client-side analytics. */
export function filterByDateRange(
  expenses: Expense[],
  range: { from?: string; to?: string },
): Expense[] {
  if (!range.from && !range.to) return expenses;
  return expenses.filter((expense) => {
    if (range.from && expense.date < range.from) return false;
    if (range.to && expense.date > range.to) return false;
    return true;
  });
}

export function filterByCategories(
  expenses: Expense[],
  categories: ExpenseCategory[] | undefined,
): Expense[] {
  if (!categories || categories.length === 0) return expenses;
  const set = new Set<ExpenseCategory>(categories);
  return expenses.filter((expense) => set.has(expense.category));
}

/** Monthly totals for [from, to] inclusive; empty months emit zero entries. */
export function monthlyTotalsForRange(
  expenses: Expense[],
  range: { from: string; to: string },
): MonthlyTotal[] {
  const months = monthKeysInRange(range.from, range.to);
  return months.map((monthKey) => {
    const monthExpenses = filterByMonth(expenses, monthKey);
    return {
      monthKey,
      total: totalAmount(monthExpenses),
      count: monthExpenses.length,
    };
  });
}

/** Human-readable observations about a month's spending for the insights panel. */
export interface Insight {
  id: string;
  tone: "positive" | "negative" | "neutral";
  title: string;
  detail: string;
}

export function generateMonthlyInsights(comparison: PeriodComparison): Insight[] {
  const insights: Insight[] = [];
  const { current, previous, deltaPercent } = comparison;

  if (current.count === 0) {
    insights.push({
      id: "empty",
      tone: "neutral",
      title: "No expenses logged yet",
      detail: "Add your first expense for the month to start tracking trends.",
    });
    return insights;
  }

  if (deltaPercent !== null) {
    const direction = deltaPercent >= 0 ? "up" : "down";
    insights.push({
      id: "month-over-month",
      tone: deltaPercent <= 0 ? "positive" : "negative",
      title: `Spending is ${direction} ${Math.abs(deltaPercent).toFixed(0)}%`,
      detail: `Compared to last month's ${formatMoney(previous.total)} you've spent ${formatMoney(current.total)} so far.`,
    });
  } else if (previous.count === 0 && current.count > 0) {
    insights.push({
      id: "first-month",
      tone: "neutral",
      title: "First month with data",
      detail: `Logged ${current.count} ${current.count === 1 ? "expense" : "expenses"} totaling ${formatMoney(current.total)}.`,
    });
  }

  if (current.topCategory) {
    insights.push({
      id: "top-category",
      tone: "neutral",
      title: `${current.topCategory.category} leads spending`,
      detail: `${formatMoney(current.topCategory.amount)} — ${current.topCategory.percent.toFixed(0)}% of this month's total.`,
    });
  }

  if (current.largest) {
    insights.push({
      id: "largest",
      tone: "neutral",
      title: "Biggest single expense",
      detail: `${formatMoney(current.largest.amount)} on ${current.largest.category}.`,
    });
  }

  return insights;
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

const WEEKDAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export interface Anomaly {
  expense: Expense;
  /** Z-score relative to the rolling baseline for the same category. */
  zScore: number;
  /** Mean of the comparison window (same category, prior 90 days). */
  baselineMean: number;
}

/**
 * Flag expenses that are statistically large vs. their category's 90-day
 * baseline (z-score >= threshold; min 5 prior samples; target itself excluded).
 */
export function detectAnomalies(
  expenses: Expense[],
  options: { zThreshold?: number; windowDays?: number; minSamples?: number } = {},
): Anomaly[] {
  const zThreshold = options.zThreshold ?? 2;
  const windowDays = options.windowDays ?? 90;
  const minSamples = options.minSamples ?? 5;
  const sorted = [...expenses].sort((a, b) => a.date.localeCompare(b.date));
  const anomalies: Anomaly[] = [];

  for (let i = 0; i < sorted.length; i += 1) {
    const target = sorted[i];
    if (!target) continue;
    const windowStart = shiftDays(target.date, -windowDays);
    const baseline = sorted.filter(
      (expense, index) =>
        index !== i &&
        expense.category === target.category &&
        expense.date >= windowStart &&
        expense.date <= target.date,
    );
    if (baseline.length < minSamples) continue;
    const amounts = baseline.map((expense) => expense.amount);
    const mean = amounts.reduce((sum, x) => sum + x, 0) / amounts.length;
    const variance =
      amounts.reduce((sum, x) => sum + (x - mean) ** 2, 0) / amounts.length;
    const stdev = Math.sqrt(variance);
    if (stdev === 0) continue;
    const z = (target.amount - mean) / stdev;
    if (z >= zThreshold) {
      anomalies.push({ expense: target, zScore: z, baselineMean: mean });
    }
  }

  return anomalies.sort((a, b) => b.zScore - a.zScore);
}

export interface WeekdayPatternEntry {
  weekday: number; // 0=Sunday .. 6=Saturday
  label: string;
  total: number;
  count: number;
  average: number;
  share: number; // fraction of total spend (0..1)
}

/** Aggregate spend by weekday to surface patterns like "most on Saturdays". */
export function weekdayPattern(expenses: Expense[]): WeekdayPatternEntry[] {
  const buckets = WEEKDAY_LABELS.map((label, weekday) => ({
    weekday,
    label,
    total: 0,
    count: 0,
  }));
  for (const expense of expenses) {
    const day = new Date(`${expense.date}T00:00:00`).getDay();
    const bucket = buckets[day];
    if (!bucket) continue;
    bucket.total += expense.amount;
    bucket.count += 1;
  }
  const total = buckets.reduce((sum, bucket) => sum + bucket.total, 0);
  return buckets.map((bucket) => ({
    ...bucket,
    average: bucket.count > 0 ? bucket.total / bucket.count : 0,
    share: total > 0 ? bucket.total / total : 0,
  }));
}

function shiftDays(dateStr: string, delta: number): string {
  const date = new Date(`${dateStr}T00:00:00`);
  date.setDate(date.getDate() + delta);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Smart insights: monthly observations plus pace projection, weekday pattern,
 * and anomaly callouts. Pure — caller supplies precomputed pieces.
 */
export function generateSmartInsights(input: {
  comparison: PeriodComparison;
  monthExpenses: Expense[];
  allExpenses: Expense[];
  paceProjection?: { projectedTotal: number; daysElapsed: number; daysInMonth: number };
  anomalies?: Anomaly[];
  weekday?: WeekdayPatternEntry[];
}): Insight[] {
  const insights = generateMonthlyInsights(input.comparison);

  if (input.paceProjection) {
    const { projectedTotal, daysElapsed, daysInMonth } = input.paceProjection;
    if (
      daysElapsed >= 3 &&
      daysElapsed < daysInMonth &&
      input.comparison.current.count > 0
    ) {
      const lastTotal = input.comparison.previous.total;
      let detail = `At your current pace you're on track for ${formatMoney(projectedTotal)} by month-end.`;
      let tone: Insight["tone"] = "neutral";
      if (lastTotal > 0) {
        const diff = ((projectedTotal - lastTotal) / lastTotal) * 100;
        const direction = diff >= 0 ? "above" : "below";
        detail += ` That's ${Math.abs(diff).toFixed(0)}% ${direction} last month.`;
        tone = diff <= 0 ? "positive" : "negative";
      }
      insights.push({
        id: "pace-projection",
        tone,
        title: "Projected month-end total",
        detail,
      });
    }
  }

  if (input.weekday && input.weekday.length > 0) {
    const top = [...input.weekday]
      .filter((entry) => entry.count > 0)
      .sort((a, b) => b.total - a.total)[0];
    if (top && top.share >= 0.25) {
      insights.push({
        id: `weekday-${top.weekday}`,
        tone: "neutral",
        title: `${top.label}s are your highest-spend day`,
        detail: `${(top.share * 100).toFixed(0)}% of recent spending happens on ${top.label}s — averaging ${formatMoney(top.average)} per expense.`,
      });
    }
  }

  if (input.anomalies && input.anomalies.length > 0) {
    const top = input.anomalies[0];
    if (top) {
      insights.push({
        id: `anomaly-${top.expense.id ?? top.expense.date}`,
        tone: "negative",
        title: "Unusual expense detected",
        detail: `${formatMoney(top.expense.amount)} on ${top.expense.category} stands out — about ${top.zScore.toFixed(1)}× higher than your typical ${top.expense.category} spend.`,
      });
    }
  }

  return insights;
}
