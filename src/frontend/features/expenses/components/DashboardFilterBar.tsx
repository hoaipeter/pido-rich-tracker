"use client";

import { useState } from "react";
import {
  EXPENSE_CATEGORIES,
  type ExpenseCategory,
  type ExpenseFilters,
} from "@shared/expenses/schemas";
import { cn } from "@frontend/lib/cn";
import {
  matchTimeRangePreset,
  timeRangePreset,
  type TimeRangePreset,
} from "../lib/format";
import { AdvancedFiltersSheet } from "./AdvancedFiltersSheet";

interface DashboardFilterBarProps {
  filters: ExpenseFilters;
  setFilters: (next: Partial<ExpenseFilters>) => void;
  clearFilters: () => void;
  activeCount: number;
}

const RANGE_OPTIONS: { id: TimeRangePreset; label: string }[] = [
  { id: "this-month", label: "This month" },
  { id: "last-month", label: "Last month" },
  { id: "last-3-months", label: "Last 3 months" },
  { id: "last-6-months", label: "Last 6 months" },
  { id: "last-12-months", label: "Last 12 months" },
  { id: "ytd", label: "Year to date" },
  { id: "all-time", label: "All time" },
];

export function DashboardFilterBar({
  filters,
  setFilters,
  clearFilters,
  activeCount,
}: DashboardFilterBarProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const activePreset = matchTimeRangePreset({
    from: filters.dateFrom,
    to: filters.dateTo,
  });
  const selectedCategories = new Set(filters.categories ?? []);

  function handlePreset(id: TimeRangePreset) {
    const range = timeRangePreset(id);
    setFilters({
      dateFrom: range?.from,
      dateTo: range?.to,
    });
  }

  function toggleCategory(category: ExpenseCategory) {
    const next = new Set(selectedCategories);
    if (next.has(category)) next.delete(category);
    else next.add(category);
    setFilters({
      categories: next.size ? (Array.from(next) as ExpenseCategory[]) : undefined,
    });
  }

  return (
    <div className="rounded-2xl border border-brand-100 bg-white/90 p-4 shadow-[0_4px_20px_-12px_rgba(223,115,150,0.18)] backdrop-blur-sm sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-brand-700">
            Range
          </label>
          <select
            value={activePreset === "custom" ? "" : activePreset}
            onChange={(event) => {
              const value = event.target.value;
              if (value) handlePreset(value as TimeRangePreset);
            }}
            className="rounded-lg border border-brand-200 bg-white px-3 py-1.5 text-sm font-medium text-brand-900 shadow-sm transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-300/40"
          >
            {activePreset === "custom" && <option value="">Custom range</option>}
            {RANGE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          {activePreset === "custom" && (
            <span className="rounded-full bg-brand-50 px-2 py-1 text-xs font-medium text-brand-700">
              {filters.dateFrom ?? "…"} → {filters.dateTo ?? "…"}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAdvancedOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-white px-3 py-1.5 text-sm font-medium text-brand-800 shadow-sm transition hover:border-brand-300 hover:bg-brand-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3.5 w-3.5"
              aria-hidden="true"
            >
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="12" x2="14" y2="12" />
              <line x1="4" y1="18" x2="9" y2="18" />
              <circle cx="17" cy="6" r="1.5" />
              <circle cx="11" cy="12" r="1.5" />
              <circle cx="7" cy="18" r="1.5" />
            </svg>
            Advanced
            {activeCount > 0 && (
              <span className="ml-1 rounded-full bg-brand-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {activeCount}
              </span>
            )}
          </button>
          {activeCount > 0 && (
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-lg px-2 py-1.5 text-xs font-semibold text-brand-700 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
          Categories
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {EXPENSE_CATEGORIES.map((category) => {
            const active = selectedCategories.has(category);
            return (
              <button
                key={category}
                type="button"
                onClick={() => toggleCategory(category)}
                aria-pressed={active}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400",
                  active
                    ? "border-brand-500 bg-brand-500 text-white shadow-sm"
                    : "border-brand-200 bg-white text-brand-800 hover:border-brand-300 hover:bg-brand-50",
                )}
              >
                {category}
              </button>
            );
          })}
        </div>
      </div>

      <AdvancedFiltersSheet
        open={advancedOpen}
        onClose={() => setAdvancedOpen(false)}
        filters={filters}
        setFilters={setFilters}
        clearFilters={clearFilters}
        activeCount={activeCount}
      />
    </div>
  );
}
