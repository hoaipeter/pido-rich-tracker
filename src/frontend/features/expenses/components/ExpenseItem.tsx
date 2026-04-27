"use client";

import { useDeleteExpense } from "../hooks/useExpenseMutations";
import { formatCurrency, formatLongDate } from "../lib/format";
import type { Expense } from "@shared/expenses/schemas";

interface Props {
  expense: Expense;
}

export function ExpenseItem({ expense }: Props) {
  const deleteExpense = useDeleteExpense();
  const dateLabel = formatLongDate(expense.date);
  const isDeleting = deleteExpense.isPending && deleteExpense.variables === expense.id;

  return (
    <li className="group flex items-center justify-between gap-3 rounded-xl border border-brand-100 bg-white/95 px-4 py-3 shadow-[0_1px_3px_rgba(223,115,150,0.08)] transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-[0_8px_20px_-10px_rgba(223,115,150,0.3)]">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-gradient-to-r from-brand-50 to-cream-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700 ring-1 ring-brand-200/70">
            {expense.category}
          </span>
          <span className="text-xs text-brand-700/60">{dateLabel}</span>
        </div>
        {expense.note && (
          <p className="mt-1 truncate text-sm text-brand-900/80">{expense.note}</p>
        )}
      </div>
      <p className="shrink-0 text-sm font-bold tabular-nums text-brand-900">
        {formatCurrency(expense.amount)}
      </p>
      <button
        type="button"
        onClick={() => deleteExpense.mutate(expense.id)}
        disabled={isDeleting}
        aria-label={`Delete ${expense.category} expense from ${dateLabel}`}
        className="shrink-0 rounded-lg p-1.5 text-brand-400 opacity-60 transition hover:bg-rose-50 hover:text-rose-600 hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:opacity-50 group-hover:opacity-100"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path d="M3 6h18" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      </button>
    </li>
  );
}
