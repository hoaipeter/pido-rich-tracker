"use client";

import {
  Card,
  CardBody,
  CardHeader,
  CardSubtitle,
  CardTitle,
} from "@frontend/components/ui/Card";
import { EmptyState } from "@frontend/components/ui/EmptyState";
import type { Anomaly } from "../lib/analytics";
import { formatCurrency, formatLongDate } from "../lib/format";

interface Props {
  anomalies: Anomaly[];
  /** Optional limit on rows displayed. Default 5. */
  limit?: number;
}

/**
 * Lists the most extreme spending anomalies surfaced by `detectAnomalies`.
 * Each row shows the expense, the z-score, and the typical baseline so users
 * can see *why* the system flagged it.
 */
export function AnomalyList({ anomalies, limit = 5 }: Props) {
  const rows = anomalies.slice(0, limit);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Unusual expenses</CardTitle>
        <CardSubtitle>
          Items that stand out compared to your typical spending in the same category.
        </CardSubtitle>
      </CardHeader>
      <CardBody>
        {rows.length === 0 ? (
          <EmptyState
            title="No outliers detected"
            description="Nothing in your recent history looks unusually large — keep it up."
          />
        ) : (
          <ul className="divide-y divide-brand-100">
            {rows.map((anomaly, index) => {
              const { expense, zScore, baselineMean } = anomaly;
              const ratio = baselineMean > 0 ? expense.amount / baselineMean : 0;
              return (
                <li
                  key={`${expense.id ?? expense.date}-${index}`}
                  className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-brand-800">
                      {expense.note?.trim() || expense.category}
                    </p>
                    <p className="truncate text-xs text-brand-600">
                      {formatLongDate(expense.date)} · {expense.category}
                      {ratio > 0 && ` · ~${ratio.toFixed(1)}× baseline`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-brand-800">
                      {formatCurrency(expense.amount)}
                    </p>
                    <p className="text-xs text-brand-500">z = {zScore.toFixed(1)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
