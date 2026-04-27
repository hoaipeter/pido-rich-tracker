import type { NextRequest } from "next/server";
import { newGoalSchema } from "@shared/goals/schemas";
import { badRequest, created, ok, withErrorHandler } from "@backend/http/api-response";
import { goalService } from "@backend/modules/goals";
import { getCurrentFamilyContext } from "@backend/auth/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withErrorHandler(async () => {
  const { familyId } = await getCurrentFamilyContext();
  const goals = await goalService.list(familyId);
  return ok(goals);
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const { familyId, userId } = await getCurrentFamilyContext();
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return badRequest("Request body must be valid JSON");
  }
  const input = newGoalSchema.parse(payload);
  const goal = await goalService.create(familyId, userId, input);
  return created(goal);
});
