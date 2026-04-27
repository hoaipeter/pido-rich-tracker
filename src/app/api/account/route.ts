import type { NextRequest } from "next/server";
import { auth } from "@backend/auth/auth";
import { UnauthorizedError } from "@backend/auth/session";
import { badRequest, noContent, ok, withErrorHandler } from "@backend/http/api-response";
import { updateAccountSchema } from "@shared/auth/schemas";
import { userService } from "@backend/modules/users/user.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * PATCH /api/account — update the signed-in user's profile.
 *
 * Currently only `name` is editable; email is locked because it doubles
 * as the auth identifier and is also the link target for outstanding
 * invites. Allowing rename here keeps the JWT name field stale until
 * the next session refresh — that's intentional and acceptable
 * (24-hour updateAge), and the response is non-cacheable so the UI can
 * refetch immediately.
 */
export const PATCH = withErrorHandler(async (request: NextRequest) => {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new UnauthorizedError();

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return badRequest("Request body must be valid JSON");
  }
  const input = updateAccountSchema.parse(payload);
  const user = await userService.updateName(userId, input.name);
  return ok(user);
});

/**
 * DELETE /api/account — hard-delete the signed-in user's account.
 *
 * Cascade rules live in `userService.deleteAccount`. Notably, this
 * REFUSES the delete (409) when the user is the sole owner of a
 * shared workspace — they have to transfer ownership first. The
 * client clears the session cookie via `signOut()` after a successful
 * 204.
 */
export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new UnauthorizedError();

  // Reconfirmation: the client must echo the user's own email back.
  // We accept both an X-Confirm-Email header and a JSON `confirmEmail`
  // body so the UI can choose whichever is more convenient.
  let confirmEmail = request.headers.get("x-confirm-email") ?? undefined;
  if (!confirmEmail) {
    try {
      const payload = (await request.json()) as { confirmEmail?: unknown };
      if (typeof payload?.confirmEmail === "string") {
        confirmEmail = payload.confirmEmail;
      }
    } catch {
      // No body / invalid JSON → header is the only source.
    }
  }

  await userService.deleteAccount(userId, confirmEmail);
  return noContent();
});
