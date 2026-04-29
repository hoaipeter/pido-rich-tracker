"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmptyState } from "@frontend/components/ui/EmptyState";
import type { DailyTotal } from "../../lib/analytics";
import { formatCompactCurrency, formatCurrency } from "../../lib/format";

interface Props {
  data: DailyTotal[];
}

export function DailySpendingChart({ data }: Props) {
  const hasData = data.some((row) => row.amount > 0);
  if (!hasData) {
    return (
      <EmptyState
        title="Nothing logged this month"
        description="Daily spending will appear here as you add expenses."
      />
    );
  }

  const chartData = data.map((row) => ({
    day: Number(row.date.slice(-2)),
    amount: Number(row.amount.toFixed(2)),
    cumulative: Number(row.cumulative.toFixed(2)),
  }));

  return (
    <div className="animate-fade-in h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="cumulativeFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#df7396" stopOpacity={0.4} />
              <stop offset="60%" stopColor="#f5b3ca" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#fff7fa" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="cumulativeStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ec8eae" />
              <stop offset="100%" stopColor="#c25c7d" />
            </linearGradient>
            <linearGradient id="dailyStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#c89066" />
              <stop offset="100%" stopColor="#9c4865" />
            </linearGradient>
            <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <CartesianGrid stroke="#fdebf2" vertical={false} strokeDasharray="3 4" />
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={false}
            tickFormatter={(value: number) => String(value)}
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
            formatter={(value, name) => [
              formatCurrency(typeof value === "number" ? value : Number(value)),
              name === "cumulative" ? "Cumulative" : "Daily",
            ]}
            labelFormatter={(label) => `Day ${label}`}
            cursor={{
              stroke: "#df7396",
              strokeOpacity: 0.4,
              strokeWidth: 2,
              strokeDasharray: "4 4",
            }}
          />
          <Legend
            verticalAlign="top"
            height={28}
            iconType="circle"
            wrapperStyle={{ fontSize: "12px" }}
            formatter={(value) => (value === "cumulative" ? "Cumulative" : "Daily")}
          />
          <Area
            type="monotone"
            dataKey="cumulative"
            stroke="url(#cumulativeStroke)"
            strokeWidth={3}
            fill="url(#cumulativeFill)"
            filter="url(#softGlow)"
            isAnimationActive
            animationDuration={900}
            animationEasing="ease-out"
            activeDot={{ r: 6, fill: "#df7396", stroke: "#fff", strokeWidth: 2 }}
          />
          <Line
            type="monotone"
            dataKey="amount"
            stroke="url(#dailyStroke)"
            strokeWidth={2.5}
            dot={false}
            isAnimationActive
            animationDuration={900}
            animationBegin={150}
            activeDot={{ r: 5, fill: "#9c4865", stroke: "#fff", strokeWidth: 2 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
