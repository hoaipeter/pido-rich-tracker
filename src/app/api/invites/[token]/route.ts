import type { NextRequest } from "next/server";
import { auth } from "@backend/auth/auth";
import { UnauthorizedError } from "@backend/auth/session";
import { ok, tooManyRequests, withErrorHandler } from "@backend/http/api-response";
import { clientIp, getRateLimiter } from "@backend/http/rate-limit";
import { inviteService } from "@backend/modules/families/invite.service.singleton";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// 10 invite-accept attempts per IP per hour. Bounds token-guessing
// even though the token space (256 bits) is already infeasible.
const inviteAcceptLimiter = getRateLimiter("invite:accept", {
  max: 10,
  windowMs: 60 * 60 * 1000,
});

interface RouteContext {
  params: Promise<{ token: string }>;
}

/**
 * POST — accept an invite. Authenticated.
 *
 * The token comes from the path (not the body) so the existing
 * `/invite/[token]` landing-page link can hit this endpoint with a
 * single fetch. The signed-in user's email MUST match the invite
 * email; the service enforces that and returns INVITE_EMAIL_MISMATCH
 * when it doesn't (mapped to 410 Gone in withErrorHandler).
 */
export const POST = withErrorHandler(
  async (request: NextRequest, context: RouteContext) => {
    const session = await auth();
    const userId = session?.user?.id;
    const userEmail = session?.user?.email;
    if (!userId || !userEmail) throw new UnauthorizedError();

    const limit = await inviteAcceptLimiter.check(clientIp(request));
    if (!limit.success) {
      return tooManyRequests("Too many invite attempts. Try again later.");
    }

    const { token } = await context.params;
    const result = await inviteService.acceptInvite({
      token,
      userId,
      userEmail,
      userName: session.user.name ?? null,
    });
    return ok(result);
  },
);
