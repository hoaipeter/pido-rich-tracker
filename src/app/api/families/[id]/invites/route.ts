import type { NextRequest } from "next/server";
import { createInviteSchema } from "@shared/families/schemas";
import { auth } from "@backend/auth/auth";
import { UnauthorizedError } from "@backend/auth/session";
import {
  badRequest,
  created,
  ok,
  tooManyRequests,
  withErrorHandler,
} from "@backend/http/api-response";
import { getRateLimiter } from "@backend/http/rate-limit";
import { inviteService } from "@backend/modules/families/invite.service.singleton";
import { sendEmail } from "@backend/email/email-client";
import { renderInviteEmail } from "@backend/email/templates/invite";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// 5 invites per inviting user per hour. Keys on userId (not IP) so
// shared NATs aren't penalised collectively.
const inviteCreateLimiter = getRateLimiter("invite:create", {
  max: 5,
  windowMs: 60 * 60 * 1000,
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET — list open invites for a family. Owner-only (enforced inside
 * the service).
 */
export const GET = withErrorHandler(
  async (_request: NextRequest, context: RouteContext) => {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) throw new UnauthorizedError();
    const { id: familyId } = await context.params;
    const invites = await inviteService.listOpen(userId, familyId);
    return ok(invites);
  },
);

/**
 * POST — create an invite for a given email. Owner-only.
 *
 * The response includes the raw invite URL because email delivery is
 * best-effort: if SMTP isn't configured (dev) or the request fails
 * (transient outage), the inviting owner can still copy/paste the link
 * manually. This is the ONE moment the unhashed token leaves the
 * server — it is never persisted, never logged, and never returned
 * again afterwards.
 */
export const POST = withErrorHandler(
  async (request: NextRequest, context: RouteContext) => {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) throw new UnauthorizedError();
    const { id: familyId } = await context.params;

    const limit = await inviteCreateLimiter.check(userId);
    if (!limit.success) {
      return tooManyRequests("Invite limit reached. Try again later.");
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return badRequest("Request body must be valid JSON");
    }
    const input = createInviteSchema.parse(payload);

    const result = await inviteService.createInvite({
      familyId,
      invitedBy: userId,
      email: input.email,
    });

    // Best-effort email send. We deliberately swallow errors here so a
    // misconfigured SMTP account / transient outage doesn't fail the
    // inviter's request — they still have the URL in the response.
    try {
      const message = renderInviteEmail({
        inviteUrl: result.inviteUrl,
        familyName: result.familyName,
        inviterName: result.inviterName,
        recipientEmail: result.invite.email,
        expiresAt: new Date(result.invite.expiresAt),
      });
      await sendEmail({
        to: result.invite.email,
        subject: message.subject,
        html: message.html,
        text: message.text,
        tag: `invite:${result.invite.id}`,
      });
    } catch (error) {
      console.warn(
        `[invite] email delivery failed for invite=${result.invite.id}`,
        error,
      );
    }

    return created({
      invite: result.invite,
      inviteUrl: result.inviteUrl,
    });
  },
);
