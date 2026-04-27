import type { NextRequest } from "next/server";
import { newGoalContributionSchema } from "@shared/goals/schemas";
import {
  badRequest,
  created,
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
    const contributions = await goalService.listContributions(familyId, id);
    return ok(contributions);
  },
);

export const POST = withErrorHandler(
  async (request: NextRequest, context: RouteContext) => {
    const { familyId, userId } = await getCurrentFamilyContext();
    const { id } = await context.params;
    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return badRequest("Request body must be valid JSON");
    }
    const input = newGoalContributionSchema.parse(payload);
    const contribution = await goalService.addContribution(familyId, userId, id, input);
    if (!contribution) {
      return notFound(
        "Goal not found or does not accept contributions (budget goals are tracked via expenses).",
      );
    }
    return created(contribution);
  },
);
