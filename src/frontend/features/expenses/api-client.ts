import type { Expense, ExpenseFilters, NewExpense } from "@shared/expenses/schemas";
import { httpRequest } from "@frontend/lib/http";
import { ApiError } from "@frontend/lib/api-error";

function buildExpensesUrl(filters: ExpenseFilters | undefined): string {
  const params = new URLSearchParams();
  if (filters?.categories?.length) params.set("categories", filters.categories.join(","));
  if (filters?.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters?.dateTo) params.set("dateTo", filters.dateTo);
  if (filters?.minAmount !== undefined)
    params.set("minAmount", String(filters.minAmount));
  if (filters?.maxAmount !== undefined)
    params.set("maxAmount", String(filters.maxAmount));
  if (filters?.search) params.set("search", filters.search);
  const qs = params.toString();
  return qs ? `/api/expenses?${qs}` : "/api/expenses";
}

export const expensesApi = {
  list(filters?: ExpenseFilters): Promise<Expense[]> {
    return httpRequest<Expense[]>(buildExpensesUrl(filters));
  },
  create(input: NewExpense): Promise<Expense> {
    return httpRequest<Expense>("/api/expenses", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  remove(id: string): Promise<void> {
    return httpRequest<void>(`/api/expenses/${id}`, { method: "DELETE" });
  },
  bulkCreate(inputs: NewExpense[]): Promise<{ inserted: number; expenses: Expense[] }> {
    return httpRequest<{ inserted: number; expenses: Expense[] }>("/api/expenses/bulk", {
      method: "POST",
      body: JSON.stringify({ expenses: inputs }),
    });
  },
};

export { ApiError };
