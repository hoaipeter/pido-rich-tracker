"use client";

import { useMemo, useState } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  CardSubtitle,
  CardTitle,
} from "@frontend/components/ui/Card";
import { ExpenseFilters } from "../components/ExpenseFilters";
import { ExpenseList } from "../components/ExpenseList";
import { ImportDialog } from "../components/ImportDialog";
import { useExpenseFilters } from "../hooks/useExpenseFilters";
import { useExpenses } from "../hooks/useExpenseQueries";
import { summarizePeriod } from "../lib/analytics";
import { expensesToCsv } from "../lib/csv";
import { formatCurrency, formatPercent } from "../lib/format";

export function ExpensesView() {
  const { filters } = useExpenseFilters();
  const query = useExpenses(filters);
  const expenses = useMemo(() => query.data ?? [], [query.data]);
  const [importOpen, setImportOpen] = useState(false);

  const summary = useMemo(() => summarizePeriod(expenses), [expenses]);

  /** Download the filtered expenses as CSV via a temporary `<a download>`. */
  const handleExport = () => {
    if (expenses.length === 0) return;
    const csv = expensesToCsv(expenses);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `expenses-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            All expenses
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Filter, search, and sort everything you&apos;ve logged.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="rounded-md border border-brand-200 bg-white px-3 py-1.5 text-sm font-medium text-brand-700 shadow-sm hover:bg-brand-50"
          >
            Import CSV
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={expenses.length === 0}
            className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Export CSV
          </button>
        </div>
      </header>

      <ExpenseFilters />

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <CardTitle>Filtered total</CardTitle>
              <CardSubtitle>
                {summary.count} {summary.count === 1 ? "entry" : "entries"} matching your
                filters.
              </CardSubtitle>
            </div>
            <p className="text-2xl font-bold tabular-nums text-slate-900">
              {formatCurrency(summary.total)}
            </p>
          </div>
        </CardHeader>
        {summary.byCategory.length > 0 && (
          <CardBody>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {summary.byCategory.map((row) => (
                <li
                  key={row.category}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                >
                  <span className="font-medium text-slate-700">{row.category}</span>
                  <span className="tabular-nums text-slate-600">
                    {formatCurrency(row.amount)}{" "}
                    <span className="text-xs text-slate-400">
                      ({formatPercent(row.percent, 0)})
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </CardBody>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Expenses</CardTitle>
          <CardSubtitle>Click the trash icon to remove an entry.</CardSubtitle>
        </CardHeader>
        <CardBody>
          <ExpenseList expenses={expenses} isLoading={query.isLoading} pageSize={25} />
        </CardBody>
      </Card>

      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}
