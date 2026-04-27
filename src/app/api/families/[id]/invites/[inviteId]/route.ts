import type { NextRequest } from "next/server";
import { auth } from "@backend/auth/auth";
import { UnauthorizedError } from "@backend/auth/session";
import { noContent, withErrorHandler } from "@backend/http/api-response";
import { inviteService } from "@backend/modules/families/invite.service.singleton";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string; inviteId: string }>;
}

/**
 * DELETE — revoke an open invite. Owner-only (enforced in service).
 */
export const DELETE = withErrorHandler(
  async (_request: NextRequest, context: RouteContext) => {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) throw new UnauthorizedError();
    const { id: familyId, inviteId } = await context.params;
    await inviteService.revokeInvite({
      actorId: userId,
      familyId,
      inviteId,
    });
    return noContent();
  },
);
