import type { NextRequest } from "next/server";
import { noContent, notFound, withErrorHandler } from "@backend/http/api-response";
import { expenseService } from "@backend/modules/expenses";
import { getCurrentFamilyContext } from "@backend/auth/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const DELETE = withErrorHandler(
  async (_request: NextRequest, context: RouteContext) => {
    const { familyId } = await getCurrentFamilyContext();
    const { id } = await context.params;
    const deleted = await expenseService.remove(familyId, id);
    if (!deleted) return notFound("Expense not found");
    return noContent();
  },
);
