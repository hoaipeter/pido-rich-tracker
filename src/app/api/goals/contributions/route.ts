import { ok, withErrorHandler } from "@backend/http/api-response";
import { goalService } from "@backend/modules/goals";
import { getCurrentFamilyContext } from "@backend/auth/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Aggregated endpoint that returns contributions across all savings goals
 * in the active family. Used by the unified Goals view so progress
 * widgets don't need to fan out one request per goal. Resolves before the
 * dynamic `/api/goals/[id]/...` route because Next prioritises static
 * segments.
 */
export const GET = withErrorHandler(async () => {
  const { familyId } = await getCurrentFamilyContext();
  const contributions = await goalService.listAllContributions(familyId);
  return ok(contributions);
});
