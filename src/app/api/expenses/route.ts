import type { NextRequest } from "next/server";
import { expenseFiltersSchema, newExpenseSchema } from "@shared/expenses/schemas";
import { badRequest, created, ok, withErrorHandler } from "@backend/http/api-response";
import { expenseService } from "@backend/modules/expenses";
import { getCurrentFamilyContext } from "@backend/auth/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseFilters(searchParams: URLSearchParams) {
  const categoriesParam = searchParams.get("categories");
  return expenseFiltersSchema.parse({
    categories: categoriesParam ? categoriesParam.split(",").filter(Boolean) : undefined,
    dateFrom: searchParams.get("dateFrom") ?? undefined,
    dateTo: searchParams.get("dateTo") ?? undefined,
    minAmount: searchParams.get("minAmount") ?? undefined,
    maxAmount: searchParams.get("maxAmount") ?? undefined,
    search: searchParams.get("search") ?? undefined,
  });
}

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { familyId } = await getCurrentFamilyContext();
  const filters = parseFilters(request.nextUrl.searchParams);
  const expenses = await expenseService.list(familyId, filters);
  return ok(expenses);
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const { familyId, userId } = await getCurrentFamilyContext();
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return badRequest("Request body must be valid JSON");
  }

  const input = newExpenseSchema.parse(payload);
  const expense = await expenseService.create(familyId, userId, input);
  return created(expense);
});
