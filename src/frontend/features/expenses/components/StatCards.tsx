"use client";

import { Card, CardBody } from "@frontend/components/ui/Card";
import { cn } from "@frontend/lib/cn";
import { formatCurrency, formatPercent } from "../lib/format";
import type { PeriodComparison } from "../lib/analytics";

interface Props {
  comparison: PeriodComparison;
}

export function StatCards({ comparison }: Props) {
  const { current, previous, deltaPercent } = comparison;
  const trend = deltaPercent === null ? "neutral" : deltaPercent <= 0 ? "down" : "up";

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="This month"
        value={formatCurrency(current.total)}
        hint={`${current.count} ${current.count === 1 ? "expense" : "expenses"}`}
      />
      <StatCard
        label="Vs last month"
        value={
          deltaPercent === null
            ? "—"
            : `${deltaPercent >= 0 ? "+" : ""}${formatPercent(deltaPercent, 0)}`
        }
        hint={`Last month: ${formatCurrency(previous.total)}`}
        tone={trend === "down" ? "positive" : trend === "up" ? "negative" : "neutral"}
      />
      <StatCard
        label="Average expense"
        value={formatCurrency(current.average)}
        hint={
          current.largest ? `Largest: ${formatCurrency(current.largest.amount)}` : "—"
        }
      />
      <StatCard
        label="Top category"
        value={current.topCategory?.category ?? "—"}
        hint={
          current.topCategory
            ? `${formatCurrency(current.topCategory.amount)} (${formatPercent(current.topCategory.percent, 0)})`
            : "No spending yet"
        }
      />
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  tone?: "positive" | "negative" | "neutral";
}

function StatCard({ label, value, hint, tone = "neutral" }: StatCardProps) {
  return (
    <Card className="relative overflow-hidden">
      {/* Decorative top accent strip */}
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-x-0 top-0 h-1",
          tone === "positive" && "bg-gradient-to-r from-brand-300 to-brand-500",
          tone === "negative" && "bg-gradient-to-r from-cream-400 to-brand-500",
          tone === "neutral" && "bg-gradient-to-r from-brand-200 to-cream-300",
        )}
      />
      <CardBody>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-500/80">
          {label}
        </p>
        <p
          className={cn(
            "mt-2 text-2xl font-bold tabular-nums tracking-tight",
            tone === "positive" && "text-brand-700",
            tone === "negative" && "text-cream-700",
            tone === "neutral" && "text-brand-900",
          )}
        >
          {value}
        </p>
        {hint && <p className="mt-1 text-xs text-brand-700/70">{hint}</p>}
      </CardBody>
    </Card>
  );
}
