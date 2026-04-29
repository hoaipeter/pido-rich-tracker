"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmptyState } from "@frontend/components/ui/EmptyState";
import type { MonthlyTotal } from "../../lib/analytics";
import type { ForecastPoint } from "../../lib/forecast";
import {
  formatCompactCurrency,
  formatCurrency,
  formatShortMonth,
} from "../../lib/format";

interface Props {
  history: MonthlyTotal[];
  forecast: ForecastPoint[];
}

interface Row {
  label: string;
  monthKey: string;
  /** Actual historical total (undefined for forecast months). */
  actual?: number;
  /** Forecast point (undefined for history months). */
  forecast?: number;
  /** [lower, upper] band for forecast months — Recharts Area expects an array. */
  band?: [number, number];
  isForecast: boolean;
}

/**
 * Combined history + forecast chart. Shows actual monthly totals as a solid
 * line and the forecasted continuation as a dashed line wrapped in a shaded
 * 80% prediction interval band.
 *
 * To get a continuous line that crosses from history → forecast, the last
 * history point is duplicated into the forecast series so the dashed line
 * starts where the solid line ends. The band uses Recharts' array dataKey
 * (`band`) which renders as a filled area between the two values.
 */
export function ForecastChart({ history, forecast }: Props) {
  const hasHistory = history.some((row) => row.total > 0);
  if (!hasHistory || forecast.length === 0) {
    return (
      <EmptyState
        title="Not enough data for a forecast"
        description="Add 30+ days of expenses across a few months and a projection appears here."
      />
    );
  }

  const lastHistory = history[history.length - 1];
  const rows: Row[] = history.map((point) => ({
    label: formatShortMonth(point.monthKey),
    monthKey: point.monthKey,
    actual: Number(point.total.toFixed(2)),
    isForecast: false,
  }));

  // Bridge row: last actual repeated as the start of the forecast line so
  // the dashed segment is anchored to the end of the solid segment.
  if (lastHistory) {
    const bridge = rows[rows.length - 1];
    if (bridge) {
      bridge.forecast = bridge.actual;
      bridge.band = [bridge.actual ?? 0, bridge.actual ?? 0];
    }
  }

  for (const point of forecast) {
    rows.push({
      label: formatShortMonth(point.monthKey),
      monthKey: point.monthKey,
      forecast: Number(point.forecast.toFixed(2)),
      band: [Number(point.lower.toFixed(2)), Number(point.upper.toFixed(2))],
      isForecast: true,
    });
  }

  return (
    <div className="animate-fade-in h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="forecastBand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#df7396" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#df7396" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#fdebf2" vertical={false} strokeDasharray="3 4" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#763850", fontSize: 11 }}
          />
          <YAxis
            tickFormatter={(value: number) => formatCompactCurrency(value)}
            tickLine={false}
            axisLine={false}
            width={60}
            tick={{ fill: "#763850", fontSize: 11 }}
          />
          <Tooltip
            cursor={{ stroke: "#df7396", strokeOpacity: 0.2 }}
            formatter={(value, name) => {
              if (Array.isArray(value)) {
                const [low, high] = value as [number, number];
                return [
                  `${formatCurrency(low)} \u2013 ${formatCurrency(high)}`,
                  "Likely range",
                ];
              }
              const label =
                name === "actual"
                  ? "Actual"
                  : name === "forecast"
                    ? "Projected"
                    : String(name ?? "");
              return [formatCurrency(Number(value)), label];
            }}
          />
          <Area
            type="monotone"
            dataKey="band"
            stroke="none"
            fill="url(#forecastBand)"
            isAnimationActive={false}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="actual"
            stroke="#9c4865"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "#9c4865" }}
            activeDot={{ r: 5 }}
            isAnimationActive
            animationDuration={600}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="forecast"
            stroke="#df7396"
            strokeWidth={2.5}
            strokeDasharray="6 4"
            dot={{ r: 3, fill: "#df7396" }}
            isAnimationActive
            animationDuration={600}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
