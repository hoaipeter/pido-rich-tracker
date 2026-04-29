"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmptyState } from "@frontend/components/ui/EmptyState";
import type { MonthlyTotal } from "../../lib/analytics";
import {
  formatCompactCurrency,
  formatCurrency,
  formatShortMonth,
} from "../../lib/format";

interface Props {
  data: MonthlyTotal[];
}

export function MonthlyTrendChart({ data }: Props) {
  const hasData = data.some((row) => row.total > 0);
  if (!hasData) {
    return (
      <EmptyState
        title="No monthly trend yet"
        description="Once you've logged expenses across multiple months, the trend appears here."
      />
    );
  }

  const chartData = data.map((row) => ({
    label: formatShortMonth(row.monthKey),
    total: Number(row.total.toFixed(2)),
    count: row.count,
  }));

  return (
    <div className="animate-fade-in h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ec8eae" />
              <stop offset="100%" stopColor="#df7396" />
            </linearGradient>
            <linearGradient id="barHover" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f5b3ca" />
              <stop offset="100%" stopColor="#c25c7d" />
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
            formatter={(value) => [
              formatCurrency(typeof value === "number" ? value : Number(value)),
              "Total",
            ]}
            cursor={{ fill: "rgb(223 115 150 / 0.10)" }}
          />
          <Bar
            dataKey="total"
            fill="url(#barFill)"
            radius={[10, 10, 4, 4]}
            maxBarSize={48}
            isAnimationActive
            animationDuration={800}
            animationEasing="ease-out"
            activeBar={{ fill: "url(#barHover)" }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
