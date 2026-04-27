"use client";

import { useEffect, useMemo } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  CardSubtitle,
  CardTitle,
} from "@frontend/components/ui/Card";
import { EmptyState } from "@frontend/components/ui/EmptyState";
import { ChartSkeleton } from "@frontend/components/ui/ChartSkeleton";
import { AnomalyList } from "../components/AnomalyList";
import { CategoryDonut } from "../components/charts/CategoryDonut";
import { DailySpendingChart } from "../components/charts/DailySpendingChart";
import { ForecastChart } from "../components/charts/ForecastChart";
import { MonthlyTrendChart } from "../components/charts/MonthlyTrendChart";
import { DashboardFilterBar } from "../components/DashboardFilterBar";
import { InsightPanel } from "../components/InsightPanel";
import { RecurringPanel } from "../components/RecurringPanel";
import { StatCards } from "../components/StatCards";
import { useExpenseFilters } from "../hooks/useExpenseFilters";
import { useExpenses } from "../hooks/useExpenseQueries";
import {
  compareMonths,
  dailyTotalsForMonth,
  detectAnomalies,
  filterByCategories,
  filterByDateRange,
  filterByMonth,
  generateSmartInsights,
  monthlyTotalsForRange,
  monthlyTotalsTrailing,
  summarizePeriod,
  weekdayPattern,
} from "../lib/analytics";
import { forecastTotal, paceForecast } from "../lib/forecast";
import { detectRecurring } from "../lib/recurring";
import {
  currentMonthKey,
  formatMonth,
  getMonthKey,
  timeRangePreset,
} from "../lib/format";

const FALLBACK_MONTHS = 6;

export function DashboardView() {
  // Dashboard filters live under their own URL prefix so they don't collide
  // with the `/expenses` filter set if a user navigates between them.
  const { filters, setFilters, clearFilters, activeCount } = useExpenseFilters({
    prefix: "dash",
  });

  // First render: default range to "this month" so charts have data without
  // requiring user input. We write to URL once on mount when no range is set.
  useEffect(() => {
    if (!filters.dateFrom && !filters.dateTo) {
      const range = timeRangePreset("this-month");
      if (range) setFilters({ dateFrom: range.from, dateTo: range.to });
    }
    // Intentionally run once; filters change should not re-trigger init.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load the *unfiltered* dataset for cross-cutting analytics (month-over-
  // month comparison, trailing trend, future forecast baselines). Filters
  // are applied client-side. For <1k rows this is faster + simpler than
  // round-tripping per filter change and keeps switching instant.
  const query = useExpenses();
  const allExpenses = useMemo(() => query.data ?? [], [query.data]);

  // Derive a "primary month" anchor from the active range. When the range
  // covers a single month, use it; otherwise default to current month.
  const primaryMonthKey = useMemo(() => {
    if (filters.dateFrom && filters.dateTo) {
      const fromMonth = getMonthKey(filters.dateFrom);
      const toMonth = getMonthKey(filters.dateTo);
      if (fromMonth === toMonth) return fromMonth;
    }
    return currentMonthKey();
  }, [filters.dateFrom, filters.dateTo]);

  // Apply category + date filters to derive the working set used by charts.
  const filtered = useMemo(() => {
    const byRange = filterByDateRange(allExpenses, {
      from: filters.dateFrom,
      to: filters.dateTo,
    });
    return filterByCategories(byRange, filters.categories);
  }, [allExpenses, filters.dateFrom, filters.dateTo, filters.categories]);

  // Comparison + insights anchor on the primary month using the *unfiltered*
  // dataset so MoM math stays meaningful when categories are selected.
  const comparison = useMemo(
    () => compareMonths(allExpenses, primaryMonthKey),
    [allExpenses, primaryMonthKey],
  );

  const filteredSummary = useMemo(() => summarizePeriod(filtered), [filtered]);

  // Pace forecast: only meaningful when the user is looking at the current
  // month. For historical months we already know the actual total.
  const isCurrentMonth = primaryMonthKey === currentMonthKey();
  const monthExpensesUnfiltered = useMemo(
    () => filterByMonth(allExpenses, primaryMonthKey),
    [allExpenses, primaryMonthKey],
  );
  const pace = useMemo(
    () => (isCurrentMonth ? paceForecast(monthExpensesUnfiltered) : null),
    [isCurrentMonth, monthExpensesUnfiltered],
  );

  // Holt-Winters monthly forecast across the unfiltered dataset so seasonal
  // patterns aren't masked by the active category filter.
  const totalForecast = useMemo(
    () => forecastTotal(allExpenses, primaryMonthKey, 2),
    [allExpenses, primaryMonthKey],
  );

  const anomalies = useMemo(() => detectAnomalies(filtered), [filtered]);

  const weekday = useMemo(() => weekdayPattern(filtered), [filtered]);

  // Recurring detection runs against the *unfiltered* dataset because
  // subscription detection needs every occurrence, not just those that
  // match the active category filter.
  const recurring = useMemo(() => detectRecurring(allExpenses), [allExpenses]);

  const insights = useMemo(
    () =>
      generateSmartInsights({
        comparison,
        monthExpenses: monthExpensesUnfiltered,
        allExpenses,
        paceProjection: pace ?? undefined,
        anomalies,
        weekday,
      }),
    [comparison, monthExpensesUnfiltered, allExpenses, pace, anomalies, weekday],
  );

  const dailyData = useMemo(
    () => dailyTotalsForMonth(filtered, primaryMonthKey),
    [filtered, primaryMonthKey],
  );

  // Monthly trend: when a range is active, render exactly that range.
  // Otherwise fall back to the trailing-N months ending at the primary month.
  const trendData = useMemo(() => {
    if (filters.dateFrom && filters.dateTo) {
      return monthlyTotalsForRange(filtered, {
        from: filters.dateFrom,
        to: filters.dateTo,
      });
    }
    return monthlyTotalsTrailing(filtered, primaryMonthKey, FALLBACK_MONTHS);
  }, [filtered, filters.dateFrom, filters.dateTo, primaryMonthKey]);

  if (query.isLoading) {
    // Mimic the dashboard layout with skeleton blocks so the loading state
    // doesn't collapse the page and cause a jarring jump on completion.
    return (
      <div className="space-y-6">
        <ChartSkeleton height="h-12" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <ChartSkeleton key={i} height="h-24" />
          ))}
        </div>
        <ChartSkeleton height="h-72" />
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartSkeleton height="h-64" />
          <ChartSkeleton height="h-64" />
        </div>
      </div>
    );
  }

  if (allExpenses.length === 0) {
    return (
      <EmptyState
        title="Nothing to analyze yet"
        description="Add a few expenses and check back — charts and insights need data to shine."
      />
    );
  }

  const hasFilteredData = filtered.length > 0;
  const dailyLabel =
    primaryMonthKey === currentMonthKey() ? "this month" : formatMonth(primaryMonthKey);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="bg-gradient-to-r from-brand-600 via-brand-500 to-cream-600 bg-clip-text text-2xl font-bold tracking-tight text-transparent sm:text-3xl">
          Dashboard
        </h1>
        <p className="text-sm text-brand-700">
          Trends, comparisons, and category insights at a glance.
        </p>
      </header>

      <DashboardFilterBar
        filters={filters}
        setFilters={setFilters}
        clearFilters={clearFilters}
        activeCount={activeCount}
      />

      {comparison && <StatCards comparison={comparison} />}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Daily spending</CardTitle>
            <CardSubtitle>
              Daily amount and cumulative running total for {dailyLabel}.
            </CardSubtitle>
          </CardHeader>
          <CardBody>
            <DailySpendingChart data={dailyData} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Category breakdown</CardTitle>
            <CardSubtitle>
              {hasFilteredData
                ? "Distribution across the selected range."
                : "No expenses match these filters."}
            </CardSubtitle>
          </CardHeader>
          <CardBody>
            <CategoryDonut data={filteredSummary.byCategory} />
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monthly trend</CardTitle>
          <CardSubtitle>
            {filters.dateFrom && filters.dateTo
              ? "Total spending per month across the selected range."
              : `Total spending per month for the last ${FALLBACK_MONTHS} months.`}
          </CardSubtitle>
        </CardHeader>
        <CardBody>
          <MonthlyTrendChart data={trendData} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Forecast</CardTitle>
          <CardSubtitle>
            Projected spending for the next two months with an 80% likely range. Based on
            the full unfiltered history.
          </CardSubtitle>
        </CardHeader>
        <CardBody>
          <ForecastChart
            history={monthlyTotalsTrailing(allExpenses, primaryMonthKey, 12)}
            forecast={totalForecast}
          />
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <InsightPanel insights={insights} />
        <AnomalyList anomalies={anomalies} />
      </div>

      <RecurringPanel series={recurring} />
    </div>
  );
}
