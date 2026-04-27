"use client";

import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import {
  EXPENSE_CATEGORIES,
  type ExpenseCategory,
  type ExpenseFilters,
} from "@shared/expenses/schemas";

const VALID_CATEGORIES = new Set<string>(EXPENSE_CATEGORIES);

function parseCategories(value: string | null): ExpenseCategory[] | undefined {
  if (!value) return undefined;
  const parts = value
    .split(",")
    .map((part) => part.trim())
    .filter((part): part is ExpenseCategory => VALID_CATEGORIES.has(part));
  return parts.length ? parts : undefined;
}

function parseNumber(value: string | null): number | undefined {
  if (value === null || value === "") return undefined;
  const num = Number(value);
  return Number.isFinite(num) && num >= 0 ? num : undefined;
}

function parseDate(value: string | null): string | undefined {
  if (!value) return undefined;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

/** URL-synced expense filter state \u2014 shareable, survives refresh. */
interface UseExpenseFiltersOptions {
  /** Optional URL param prefix so multiple filter sets can coexist on a page. */
  prefix?: string;
}

export function useExpenseFilters(options: UseExpenseFiltersOptions = {}) {
  const { prefix = "" } = options;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const k = useCallback(
    (name: string) => (prefix ? `${prefix}_${name}` : name),
    [prefix],
  );

  const filters: ExpenseFilters = useMemo(
    () => ({
      categories: parseCategories(searchParams.get(k("categories"))),
      dateFrom: parseDate(searchParams.get(k("dateFrom"))),
      dateTo: parseDate(searchParams.get(k("dateTo"))),
      minAmount: parseNumber(searchParams.get(k("minAmount"))),
      maxAmount: parseNumber(searchParams.get(k("maxAmount"))),
      search: searchParams.get(k("search"))?.trim() || undefined,
    }),
    [k, searchParams],
  );

  const setFilters = useCallback(
    (next: Partial<ExpenseFilters>) => {
      const params = new URLSearchParams(searchParams.toString());
      const merged: ExpenseFilters = { ...filters, ...next };

      const writeOrDelete = (name: string, value: string | undefined) => {
        const key = k(name);
        if (value && value.length > 0) params.set(key, value);
        else params.delete(key);
      };

      writeOrDelete("categories", merged.categories?.join(",") || undefined);
      writeOrDelete("dateFrom", merged.dateFrom);
      writeOrDelete("dateTo", merged.dateTo);
      writeOrDelete(
        "minAmount",
        merged.minAmount !== undefined ? String(merged.minAmount) : undefined,
      );
      writeOrDelete(
        "maxAmount",
        merged.maxAmount !== undefined ? String(merged.maxAmount) : undefined,
      );
      writeOrDelete("search", merged.search);

      const qs = params.toString();
      const target = (qs ? `${pathname}?${qs}` : pathname) as Route;
      router.replace(target, { scroll: false });
    },
    [filters, k, pathname, router, searchParams],
  );

  const clearFilters = useCallback(() => {
    // Only delete keys this hook owns; preserve unrelated query params.
    const params = new URLSearchParams(searchParams.toString());
    for (const name of [
      "categories",
      "dateFrom",
      "dateTo",
      "minAmount",
      "maxAmount",
      "search",
    ]) {
      params.delete(k(name));
    }
    const qs = params.toString();
    const target = (qs ? `${pathname}?${qs}` : pathname) as Route;
    router.replace(target, { scroll: false });
  }, [k, pathname, router, searchParams]);

  const activeCount = useMemo(() => {
    let count = 0;
    if (filters.categories?.length) count += 1;
    if (filters.dateFrom || filters.dateTo) count += 1;
    if (filters.minAmount !== undefined || filters.maxAmount !== undefined) count += 1;
    if (filters.search) count += 1;
    return count;
  }, [filters]);

  return { filters, setFilters, clearFilters, activeCount };
}
