import type { NextRequest } from "next/server";
import { updateBudgetGoalSchema, updateSavingsGoalSchema } from "@shared/goals/schemas";
import {
  badRequest,
  noContent,
  notFound,
  ok,
  withErrorHandler,
} from "@backend/http/api-response";
import { goalService } from "@backend/modules/goals";
import { getCurrentFamilyContext } from "@backend/auth/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const GET = withErrorHandler(
  async (_request: NextRequest, context: RouteContext) => {
    const { familyId } = await getCurrentFamilyContext();
    const { id } = await context.params;
    const goal = await goalService.get(familyId, id);
    if (!goal) return notFound("Goal not found");
    return ok(goal);
  },
);

export const PATCH = withErrorHandler(
  async (request: NextRequest, context: RouteContext) => {
    const { familyId } = await getCurrentFamilyContext();
    const { id } = await context.params;
    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return badRequest("Request body must be valid JSON");
    }
    // The goal's kind is immutable, so we route to the matching schema based
    // on the persisted goal rather than trusting client-supplied kind.
    const existing = await goalService.get(familyId, id);
    if (!existing) return notFound("Goal not found");
    const schema =
      existing.kind === "savings" ? updateSavingsGoalSchema : updateBudgetGoalSchema;
    const patch = schema.parse(payload);
    const updated = await goalService.update(familyId, id, patch);
    if (!updated) return notFound("Goal not found");
    return ok(updated);
  },
);

export const DELETE = withErrorHandler(
  async (_request: NextRequest, context: RouteContext) => {
    const { familyId } = await getCurrentFamilyContext();
    const { id } = await context.params;
    const removed = await goalService.remove(familyId, id);
    if (!removed) return notFound("Goal not found");
    return noContent();
  },
);
