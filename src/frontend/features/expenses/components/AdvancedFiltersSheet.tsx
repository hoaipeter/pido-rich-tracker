"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  EXPENSE_CATEGORIES,
  type ExpenseCategory,
  type ExpenseFilters,
} from "@shared/expenses/schemas";
import { cn } from "@frontend/lib/cn";

interface AdvancedFiltersSheetProps {
  open: boolean;
  onClose: () => void;
  filters: ExpenseFilters;
  setFilters: (next: Partial<ExpenseFilters>) => void;
  clearFilters: () => void;
  activeCount: number;
}

const fieldClass =
  "rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm text-brand-900 shadow-sm transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-300/40";

/**
 * Slide-over sheet exposing the full filter surface (search, custom date
 * range, amount range, categories). Reuses the same hook-driven filter state
 * as the dashboard quick bar so changes here update the bar live.
 */
export function AdvancedFiltersSheet({
  open,
  onClose,
  filters,
  setFilters,
  clearFilters,
  activeCount,
}: AdvancedFiltersSheetProps) {
  // Debounce the search input so we don't flood the URL on every keystroke.
  const [searchDraft, setSearchDraft] = useState(filters.search ?? "");
  useEffect(() => {
    setSearchDraft(filters.search ?? "");
  }, [filters.search]);
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      const next = searchDraft.trim() || undefined;
      if ((filters.search ?? undefined) !== next) {
        setFilters({ search: next });
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchDraft, filters.search, setFilters, open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  function toggleCategory(category: ExpenseCategory) {
    const current = new Set(filters.categories ?? []);
    if (current.has(category)) current.delete(category);
    else current.add(category);
    setFilters({
      categories: current.size ? (Array.from(current) as ExpenseCategory[]) : undefined,
    });
  }

  const selectedCategories = new Set(filters.categories ?? []);

  // Render to document.body via a portal so the fixed-positioned overlay
  // escapes any ancestor that establishes a containing block for fixed
  // descendants (e.g. `backdrop-filter` on the surrounding filter bar
  // wrapper would otherwise clip this sheet to that wrapper's box).
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return null;

  return createPortal(
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-brand-900/30 backdrop-blur-sm transition-opacity",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <aside
        role="dialog"
        aria-label="Advanced filters"
        aria-hidden={!open}
        className={cn(
          "fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-brand-200 bg-white shadow-2xl transition-transform duration-200",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <header className="flex items-center justify-between border-b border-brand-100 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-brand-900">Advanced filters</h2>
            <p className="text-xs text-brand-700">
              {activeCount > 0 ? `${activeCount} active` : "All filters cleared"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className="rounded-md p-1.5 text-brand-700 transition hover:bg-brand-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <div>
            <label
              htmlFor="adv-search"
              className="block text-sm font-medium text-brand-900"
            >
              Search
            </label>
            <input
              id="adv-search"
              type="search"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Search notes or category…"
              className={`${fieldClass} mt-1.5 w-full`}
              autoComplete="off"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="adv-dateFrom"
                className="block text-sm font-medium text-brand-900"
              >
                From
              </label>
              <input
                id="adv-dateFrom"
                type="date"
                value={filters.dateFrom ?? ""}
                onChange={(event) =>
                  setFilters({ dateFrom: event.target.value || undefined })
                }
                className={`${fieldClass} mt-1.5 w-full`}
              />
            </div>
            <div>
              <label
                htmlFor="adv-dateTo"
                className="block text-sm font-medium text-brand-900"
              >
                To
              </label>
              <input
                id="adv-dateTo"
                type="date"
                value={filters.dateTo ?? ""}
                onChange={(event) =>
                  setFilters({ dateTo: event.target.value || undefined })
                }
                className={`${fieldClass} mt-1.5 w-full`}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="adv-min"
                className="block text-sm font-medium text-brand-900"
              >
                Min amount
              </label>
              <input
                id="adv-min"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={filters.minAmount ?? ""}
                onChange={(event) =>
                  setFilters({
                    minAmount: event.target.value
                      ? Number(event.target.value)
                      : undefined,
                  })
                }
                placeholder="0"
                className={`${fieldClass} mt-1.5 w-full`}
              />
            </div>
            <div>
              <label
                htmlFor="adv-max"
                className="block text-sm font-medium text-brand-900"
              >
                Max amount
              </label>
              <input
                id="adv-max"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={filters.maxAmount ?? ""}
                onChange={(event) =>
                  setFilters({
                    maxAmount: event.target.value
                      ? Number(event.target.value)
                      : undefined,
                  })
                }
                placeholder="No limit"
                className={`${fieldClass} mt-1.5 w-full`}
              />
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-brand-900">Categories</p>
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
                        ? "border-brand-500 bg-brand-500 text-white"
                        : "border-brand-200 bg-white text-brand-800 hover:border-brand-300 hover:bg-brand-50",
                    )}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <footer className="flex items-center justify-between border-t border-brand-100 px-5 py-4">
          <button
            type="button"
            onClick={clearFilters}
            disabled={activeCount === 0}
            className="rounded-lg px-3 py-1.5 text-sm font-semibold text-brand-700 transition hover:underline disabled:cursor-not-allowed disabled:opacity-40"
          >
            Clear all
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-brand-500 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
          >
            Done
          </button>
        </footer>
      </aside>
    </>,
    document.body,
  );
}
