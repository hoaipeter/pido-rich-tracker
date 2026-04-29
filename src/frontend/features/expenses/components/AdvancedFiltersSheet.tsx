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
  const [prevSearch, setPrevSearch] = useState(filters.search ?? "");
  if (prevSearch !== (filters.search ?? "")) {
    setPrevSearch(filters.search ?? "");
    setSearchDraft(filters.search ?? "");
  }
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);
  if (!mounted) return null;

  return createPortal(
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        className={cn(
          "bg-brand-900/30 fixed inset-0 z-40 backdrop-blur-sm transition-opacity",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <aside
        role="dialog"
        aria-label="Advanced filters"
        aria-hidden={!open}
        className={cn(
          "border-brand-200 fixed top-0 right-0 z-50 flex h-full w-full max-w-md flex-col border-l bg-white shadow-2xl transition-transform duration-200",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <header className="border-brand-100 flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-brand-900 text-base font-semibold">Advanced filters</h2>
            <p className="text-brand-700 text-xs">
              {activeCount > 0 ? `${activeCount} active` : "All filters cleared"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className="text-brand-700 hover:bg-brand-50 focus-visible:ring-brand-400 rounded-md p-1.5 transition focus:outline-none focus-visible:ring-2"
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
              className="text-brand-900 block text-sm font-medium"
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
                className="text-brand-900 block text-sm font-medium"
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
                className="text-brand-900 block text-sm font-medium"
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
                className="text-brand-900 block text-sm font-medium"
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
                className="text-brand-900 block text-sm font-medium"
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
            <p className="text-brand-900 text-sm font-medium">Categories</p>
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
                      "focus-visible:ring-brand-400 rounded-full border px-3 py-1 text-xs font-medium transition focus:outline-none focus-visible:ring-2",
                      active
                        ? "border-brand-500 bg-brand-500 text-white"
                        : "border-brand-200 text-brand-800 hover:border-brand-300 hover:bg-brand-50 bg-white",
                    )}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <footer className="border-brand-100 flex items-center justify-between border-t px-5 py-4">
          <button
            type="button"
            onClick={clearFilters}
            disabled={activeCount === 0}
            className="text-brand-700 rounded-lg px-3 py-1.5 text-sm font-semibold transition hover:underline disabled:cursor-not-allowed disabled:opacity-40"
          >
            Clear all
          </button>
          <button
            type="button"
            onClick={onClose}
            className="bg-brand-500 hover:bg-brand-600 focus-visible:ring-brand-400 rounded-lg px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition focus:outline-none focus-visible:ring-2"
          >
            Done
          </button>
        </footer>
      </aside>
    </>,
    document.body,
  );
}
