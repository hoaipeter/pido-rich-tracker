"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  CardSubtitle,
  CardTitle,
} from "@frontend/components/ui/Card";
import { Spinner } from "@frontend/components/ui/Spinner";
import { ExpenseForm } from "../components/ExpenseForm";
import { ExpenseList } from "../components/ExpenseList";
import { InsightPanel } from "../components/InsightPanel";
import { MonthSelector } from "../components/MonthSelector";
import { StatCards } from "../components/StatCards";
import { CategoryDonut } from "../components/charts/CategoryDonut";
import { useExpenses } from "../hooks/useExpenseQueries";
import {
  compareMonths,
  generateMonthlyInsights,
  listAvailableMonths,
} from "../lib/analytics";
import { currentMonthKey, monthRange } from "../lib/format";

export function HomeView() {
  // Defer reading currentMonthKey() to avoid SSR/CSR timezone drift.
  const [selectedMonth, setSelectedMonth] = useState<string>("");

  useEffect(() => {
    setSelectedMonth(currentMonthKey());
  }, []);

  // Fetch only the selected month's data plus the previous month's data via a
  // wider date range — that's all the home page needs.
  const monthFilters = useMemo(() => {
    if (!selectedMonth) return undefined;
    const { from } = monthRange(selectedMonth);
    const { to } = monthRange(selectedMonth);
    return { dateFrom: from, dateTo: to };
  }, [selectedMonth]);

  const monthQuery = useExpenses(monthFilters);
  // Load all expenses (light query) for available month list + comparison.
  const allExpensesQuery = useExpenses();

  const monthExpenses = monthQuery.data ?? [];
  const allExpenses = useMemo(() => allExpensesQuery.data ?? [], [allExpensesQuery.data]);
  const monthOptions = useMemo(() => listAvailableMonths(allExpenses), [allExpenses]);

  const comparison = useMemo(
    () => (selectedMonth ? compareMonths(allExpenses, selectedMonth) : null),
    [allExpenses, selectedMonth],
  );
  const insights = useMemo(
    () => (comparison ? generateMonthlyInsights(comparison) : []),
    [comparison],
  );

  if (!selectedMonth) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-slate-500">
        <Spinner /> <span className="ml-2">Loading…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-500/80">
            Pido dashboard
          </p>
          <h1 className="mt-1 bg-gradient-to-r from-brand-700 via-brand-500 to-cream-600 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent sm:text-4xl">
            Welcome back
          </h1>
          <p className="mt-1 text-sm text-brand-700/70">
            A cozy view of where your money is going this month.
          </p>
        </div>
        <MonthSelector
          value={selectedMonth}
          options={monthOptions}
          onChange={setSelectedMonth}
        />
      </header>

      {comparison && <StatCards comparison={comparison} />}

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Quick add</CardTitle>
              <CardSubtitle>
                Logged expenses appear instantly across the app.
              </CardSubtitle>
            </div>
            <Link
              href="/add"
              className="rounded-md text-xs font-semibold text-emerald-700 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              Open full form →
            </Link>
          </div>
        </CardHeader>
        <CardBody>
          <ExpenseForm autoFocus compact />
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Category breakdown</CardTitle>
            <CardSubtitle>How this month&apos;s spending is distributed.</CardSubtitle>
          </CardHeader>
          <CardBody>
            <CategoryDonut data={comparison?.current.byCategory ?? []} />
          </CardBody>
        </Card>

        <InsightPanel insights={insights} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Recent expenses</CardTitle>
              <CardSubtitle>Latest entries for the selected month.</CardSubtitle>
            </div>
            <Link
              href="/expenses"
              className="rounded-md text-xs font-semibold text-emerald-700 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              View all →
            </Link>
          </div>
        </CardHeader>
        <CardBody>
          <ExpenseList
            expenses={monthExpenses}
            isLoading={monthQuery.isLoading}
            pageSize={10}
            emptyTitle="No expenses this month yet"
            emptyDescription="Use the quick-add form above to log your first one."
          />
        </CardBody>
      </Card>
    </div>
  );
}
