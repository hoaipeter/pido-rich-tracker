import type { NextRequest } from "next/server";
import { notFound, okPublic, withErrorHandler } from "@backend/http/api-response";
import { inviteService } from "@backend/modules/families/invite.service.singleton";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ token: string }>;
}

/**
 * GET — public, unauthenticated invite preview.
 *
 * Allow-listed by `auth.config.ts` — the landing page calls this
 * before the user signs in so it can render "Family X invites you,
 * sign in as you@example.com to accept" without first forcing auth.
 *
 * Deliberately collapses every "this token can't be used" reason
 * (unknown / expired / revoked / accepted) into a single 404 so we
 * don't leak which case applies. The 404 keeps the default
 * `private, no-store` so it isn't sticky; the success response is
 * publicly cacheable for a short window because the token itself
 * is the access secret.
 */
export const GET = withErrorHandler(
  async (_request: NextRequest, context: RouteContext) => {
    const { token } = await context.params;
    const preview = await inviteService.previewByToken(token);
    if (!preview) {
      return notFound("This invite is invalid, used, or expired.");
    }
    return okPublic(preview, { maxAge: 30, swr: 60 });
  },
);
