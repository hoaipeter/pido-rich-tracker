"use client";

import {
  Card,
  CardBody,
  CardHeader,
  CardSubtitle,
  CardTitle,
} from "@frontend/components/ui/Card";
import { EmptyState } from "@frontend/components/ui/EmptyState";
import type { RecurringSeries } from "../lib/recurring";
import { formatCurrency, formatLongDate } from "../lib/format";

interface Props {
  series: RecurringSeries[];
}

const CADENCE_LABEL: Record<RecurringSeries["cadence"], string> = {
  weekly: "Weekly",
  biweekly: "Every 2 weeks",
  monthly: "Monthly",
};

/**
 * Surfaces likely subscriptions / recurring bills detected from expense
 * patterns. Estimated monthly impact is shown so users can prioritise
 * trimming the biggest ongoing expenses.
 */
export function RecurringPanel({ series }: Props) {
  const monthlyTotal = series.reduce((sum, item) => {
    return sum + monthlyImpact(item.averageAmount, item.cadence);
  }, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recurring expenses</CardTitle>
        <CardSubtitle>
          {series.length > 0
            ? `Detected ${series.length} recurring item${series.length === 1 ? "" : "s"} · ~${formatCurrency(monthlyTotal)}/month`
            : "We'll spot subscriptions automatically as patterns emerge."}
        </CardSubtitle>
      </CardHeader>
      <CardBody>
        {series.length === 0 ? (
          <EmptyState
            title="No recurring patterns yet"
            description="Log a few months of similar expenses (e.g. subscriptions) and we'll detect them here."
          />
        ) : (
          <ul className="divide-y divide-brand-100">
            {series.slice(0, 8).map((item) => (
              <li
                key={item.key}
                className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium capitalize text-brand-800">
                    {item.label}
                  </p>
                  <p className="truncate text-xs text-brand-600">
                    {item.category} · {CADENCE_LABEL[item.cadence]} · last on{" "}
                    {formatLongDate(item.lastSeen)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-brand-800">
                    {formatCurrency(item.averageAmount)}
                  </p>
                  <p className="text-xs text-brand-500">
                    next ~{formatLongDate(item.nextExpected)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

function monthlyImpact(amount: number, cadence: RecurringSeries["cadence"]): number {
  switch (cadence) {
    case "weekly":
      return amount * 4.33;
    case "biweekly":
      return amount * 2.17;
    case "monthly":
      return amount;
  }
}
