import type { NextRequest } from "next/server";
import { auth } from "@backend/auth/auth";
import { UnauthorizedError } from "@backend/auth/session";
import { badRequest, noContent, withErrorHandler } from "@backend/http/api-response";
import { familyService } from "@backend/modules/families/family.service";
import { updateMemberRoleSchema } from "@shared/families/schemas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string; userId: string }>;
}

/**
 * PATCH — change a member's role (promote / demote).
 *
 * Owner-only. Service rejects demoting the last owner with a 409
 * `LAST_OWNER`, and a no-op role change with a 400 `NO_OP` so the UI
 * can show a friendly message. Bumps `membershipVersion` on success
 * so the affected user's JWT is invalidated on their next request.
 */
export const PATCH = withErrorHandler(
  async (request: NextRequest, context: RouteContext) => {
    const session = await auth();
    const actorId = session?.user?.id;
    if (!actorId) throw new UnauthorizedError();
    const { id: familyId, userId: targetUserId } = await context.params;

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return badRequest("Request body must be valid JSON");
    }
    const input = updateMemberRoleSchema.parse(payload);
    await familyService.setMemberRole(actorId, familyId, targetUserId, input.role);
    return noContent();
  },
);

/**
 * DELETE — remove a member from the family.
 *
 * Two flows share this endpoint:
 *   - **Owner removes member**: actor is owner, target is anyone else.
 *   - **Self-leave**: actor === target. Allowed for any role except
 *     last owner; service enforces.
 *
 * On success we return 204; the client should `session.update()` if
 * the actor removed themselves so the JWT picks up a new active
 * family (or auto-creates one).
 */
export const DELETE = withErrorHandler(
  async (_request: NextRequest, context: RouteContext) => {
    const session = await auth();
    const actorId = session?.user?.id;
    if (!actorId) throw new UnauthorizedError();

    const { id: familyId, userId: targetUserId } = await context.params;
    await familyService.removeMember(actorId, familyId, targetUserId);
    return noContent();
  },
);
