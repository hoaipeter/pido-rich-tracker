"use client";

import { useEffect, useState } from "react";
import { useExpenseFilters } from "../hooks/useExpenseFilters";
import { currentMonthKey, monthRange, shiftMonth, todayIso } from "../lib/format";
import { EXPENSE_CATEGORIES, type ExpenseCategory } from "@shared/expenses/schemas";

const fieldClass =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30";

interface DatePreset {
  id: string;
  label: string;
  resolve: () => { dateFrom: string; dateTo: string };
}

function rangeToFilter(range: { from: string; to: string }) {
  return { dateFrom: range.from, dateTo: range.to };
}

const DATE_PRESETS: DatePreset[] = [
  {
    id: "this-month",
    label: "This month",
    resolve: () => rangeToFilter(monthRange(currentMonthKey())),
  },
  {
    id: "last-month",
    label: "Last month",
    resolve: () => rangeToFilter(monthRange(shiftMonth(currentMonthKey(), -1))),
  },
  {
    id: "last-7",
    label: "Last 7 days",
    resolve: () => {
      const today = new Date();
      const start = new Date();
      start.setDate(today.getDate() - 6);
      return {
        dateFrom: start.toISOString().slice(0, 10),
        dateTo: todayIso(),
      };
    },
  },
  {
    id: "last-30",
    label: "Last 30 days",
    resolve: () => {
      const today = new Date();
      const start = new Date();
      start.setDate(today.getDate() - 29);
      return {
        dateFrom: start.toISOString().slice(0, 10),
        dateTo: todayIso(),
      };
    },
  },
  {
    id: "ytd",
    label: "Year to date",
    resolve: () => ({
      dateFrom: `${new Date().getFullYear()}-01-01`,
      dateTo: todayIso(),
    }),
  },
];

export function ExpenseFilters() {
  const { filters, setFilters, clearFilters, activeCount } = useExpenseFilters();

  // Debounce the search input so we don't flood the URL/API on every keystroke.
  const [searchDraft, setSearchDraft] = useState(filters.search ?? "");
  useEffect(() => {
    setSearchDraft(filters.search ?? "");
  }, [filters.search]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if ((filters.search ?? "") !== searchDraft) {
        setFilters({ search: searchDraft.trim() || undefined });
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchDraft, filters.search, setFilters]);

  function toggleCategory(category: ExpenseCategory) {
    const current = new Set(filters.categories ?? []);
    if (current.has(category)) current.delete(category);
    else current.add(category);
    setFilters({
      categories: current.size ? (Array.from(current) as ExpenseCategory[]) : undefined,
    });
  }

  function applyPreset(preset: DatePreset) {
    const range = preset.resolve();
    setFilters(range);
  }

  const selectedCategories = new Set(filters.categories ?? []);

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Filter & search</h2>
          <p className="mt-1 text-sm text-slate-500">
            Combine filters to narrow the list. State is shareable via URL.
          </p>
        </div>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-md text-xs font-semibold text-emerald-700 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            Clear all ({activeCount})
          </button>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr_1fr]">
        <div>
          <label htmlFor="search" className="block text-sm font-medium text-slate-700">
            Search
          </label>
          <div className="relative mt-1.5">
            <input
              id="search"
              type="search"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Search notes or category…"
              className={`${fieldClass} w-full pl-9`}
              autoComplete="off"
            />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </div>
        </div>

        <div>
          <label htmlFor="dateFrom" className="block text-sm font-medium text-slate-700">
            From
          </label>
          <input
            id="dateFrom"
            type="date"
            value={filters.dateFrom ?? ""}
            onChange={(event) =>
              setFilters({ dateFrom: event.target.value || undefined })
            }
            className={`${fieldClass} mt-1.5 w-full`}
          />
        </div>

        <div>
          <label htmlFor="dateTo" className="block text-sm font-medium text-slate-700">
            To
          </label>
          <input
            id="dateTo"
            type="date"
            value={filters.dateTo ?? ""}
            onChange={(event) => setFilters({ dateTo: event.target.value || undefined })}
            className={`${fieldClass} mt-1.5 w-full`}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="minAmount" className="block text-sm font-medium text-slate-700">
            Min amount
          </label>
          <input
            id="minAmount"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={filters.minAmount ?? ""}
            onChange={(event) =>
              setFilters({
                minAmount: event.target.value ? Number(event.target.value) : undefined,
              })
            }
            className={`${fieldClass} mt-1.5 w-full`}
            placeholder="0"
          />
        </div>
        <div>
          <label htmlFor="maxAmount" className="block text-sm font-medium text-slate-700">
            Max amount
          </label>
          <input
            id="maxAmount"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={filters.maxAmount ?? ""}
            onChange={(event) =>
              setFilters({
                maxAmount: event.target.value ? Number(event.target.value) : undefined,
              })
            }
            className={`${fieldClass} mt-1.5 w-full`}
            placeholder="No limit"
          />
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-slate-700">Quick ranges</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {DATE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset)}
              className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-slate-700">Categories</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {EXPENSE_CATEGORIES.map((category) => {
            const active = selectedCategories.has(category);
            return (
              <button
                key={category}
                type="button"
                onClick={() => toggleCategory(category)}
                aria-pressed={active}
                className={
                  "rounded-full border px-3 py-1 text-xs font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 " +
                  (active
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700")
                }
              >
                {category}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
