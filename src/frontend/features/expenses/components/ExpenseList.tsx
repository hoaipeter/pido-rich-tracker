"use client";

import { useMemo, useState } from "react";
import { EmptyState } from "@frontend/components/ui/EmptyState";
import { Spinner } from "@frontend/components/ui/Spinner";
import type { Expense } from "@shared/expenses/schemas";
import { ExpenseItem } from "./ExpenseItem";

type SortKey = "date-desc" | "date-asc" | "amount-desc" | "amount-asc";

interface Props {
  expenses: Expense[] | undefined;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  pageSize?: number;
}

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "date-desc", label: "Newest first" },
  { value: "date-asc", label: "Oldest first" },
  { value: "amount-desc", label: "Highest amount" },
  { value: "amount-asc", label: "Lowest amount" },
];

export function ExpenseList({
  expenses,
  isLoading = false,
  emptyTitle = "No expenses match your filters",
  emptyDescription = "Adjust the filters above or add a new expense to get started.",
  pageSize = 25,
}: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("date-desc");
  const [visible, setVisible] = useState<number>(pageSize);

  const sorted = useMemo(() => {
    if (!expenses) return [];
    const copy = [...expenses];
    switch (sortKey) {
      case "date-asc":
        return copy.sort((a, b) => a.date.localeCompare(b.date));
      case "date-desc":
        return copy.sort((a, b) => b.date.localeCompare(a.date));
      case "amount-asc":
        return copy.sort((a, b) => a.amount - b.amount);
      case "amount-desc":
        return copy.sort((a, b) => b.amount - a.amount);
      default:
        return copy;
    }
  }, [expenses, sortKey]);

  const visibleItems = sorted.slice(0, visible);
  const hasMore = sorted.length > visibleItems.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {isLoading ? (
            <span className="inline-flex items-center gap-2">
              <Spinner /> Loading expenses…
            </span>
          ) : (
            <>
              Showing{" "}
              <span className="font-medium text-slate-900">{visibleItems.length}</span> of{" "}
              <span className="font-medium text-slate-900">{sorted.length}</span>
            </>
          )}
        </p>
        <div className="flex items-center gap-2">
          <label htmlFor="sort" className="text-sm font-medium text-slate-600">
            Sort
          </label>
          <select
            id="sort"
            value={sortKey}
            onChange={(event) => setSortKey(event.target.value as SortKey)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!isLoading && sorted.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <ul className="space-y-2">
          {visibleItems.map((expense) => (
            <ExpenseItem key={expense.id} expense={expense} />
          ))}
        </ul>
      )}

      {hasMore && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setVisible((v) => v + pageSize)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            Show {Math.min(pageSize, sorted.length - visibleItems.length)} more
          </button>
        </div>
      )}
    </div>
  );
}
