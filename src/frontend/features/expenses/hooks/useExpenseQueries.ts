"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { expensesApi } from "../api-client";
import type { Expense, ExpenseFilters } from "@shared/expenses/schemas";
import { STALE } from "@frontend/lib/queryConstants";

/**
 * React Query keys are namespaced by feature. The factory keeps cache keys
 * consistent and makes invalidation patterns easy to reason about.
 */
export const expenseKeys = {
  all: ["expenses"] as const,
  list: (filters?: ExpenseFilters) =>
    [...expenseKeys.all, "list", filters ?? {}] as const,
};

export function useExpenses(filters?: ExpenseFilters): UseQueryResult<Expense[], Error> {
  return useQuery({
    queryKey: expenseKeys.list(filters),
    queryFn: () => expensesApi.list(filters),
    staleTime: STALE.DEFAULT,
    placeholderData: (previous) => previous,
  });
}
