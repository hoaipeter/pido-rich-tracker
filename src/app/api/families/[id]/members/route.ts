import type { NextRequest } from "next/server";
import { auth } from "@backend/auth/auth";
import { UnauthorizedError } from "@backend/auth/session";
import { ok, withErrorHandler } from "@backend/http/api-response";
import { familyService } from "@backend/modules/families/family.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET — list members of a family. Membership-only.
 *
 * Members see each other's snapshot (display name + email). v1 does
 * not redact email addresses; the threat model is "people you invited
 * to the same shared workspace", who already have your email by
 * definition.
 */
export const GET = withErrorHandler(
  async (_request: NextRequest, context: RouteContext) => {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) throw new UnauthorizedError();
    const { id: familyId } = await context.params;
    const members = await familyService.listMembers(userId, familyId);
    return ok(members);
  },
);
