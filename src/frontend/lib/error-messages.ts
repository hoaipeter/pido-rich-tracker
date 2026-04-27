import { ApiError, ClientErrorCodes } from "./api-error";

/**
 * Friendly, user-facing copy keyed by server error code.
 *
 * Why a central catalog?
 *  - Server messages are written for engineers; UX needs gentler copy.
 *  - Same code is rendered identically across forms / banners / toasts.
 *  - When a backend message changes, we don't have to chase down 5
 *    hard-coded strings in views.
 *
 * Anything not in the catalog falls back to the server's `message`,
 * which is already a sensible English sentence in this codebase.
 */
const MESSAGES: Record<string, string> = {
  // Transport
  [ClientErrorCodes.Network]:
    "We couldn't reach the server. Check your connection and try again.",
  [ClientErrorCodes.Offline]:
    "You appear to be offline. We'll resume when your connection is back.",
  [ClientErrorCodes.Aborted]: "The request was cancelled.",
  [ClientErrorCodes.InvalidResponse]:
    "The server returned an unexpected response. Please retry.",

  // Auth domain
  EMAIL_NOT_ALLOWED: "This email isn't on the allowlist for this app.",
  EMAIL_TAKEN: "An account with this email already exists.",
  INVALID_CREDENTIALS: "Email or password is incorrect.",
  USER_NOT_FOUND: "We couldn't find that account.",
  INVALID_NAME: "Please enter a valid name.",
  SOLE_OWNER:
    "You're the only owner of a shared workspace. Promote another member to owner before deleting your account.",

  // Family / workspace domain
  NOT_OWNER: "Only owners can perform this action.",
  NOT_MEMBER: "You're not a member of this workspace.",
  FAMILY_NOT_FOUND: "This workspace no longer exists.",
  LAST_OWNER:
    "There must always be at least one owner. Promote another member before stepping down.",
  ALREADY_MEMBER: "That person is already a member of this workspace.",
  NO_OP: "Nothing to change — that's already the current value.",
  STALE_MEMBERSHIP: "Your access changed. Please refresh and try again.",

  // Invites
  INVITE_NOT_FOUND: "This invite is no longer valid.",
  INVITE_EXPIRED: "This invite has expired. Ask the workspace owner to send a new one.",
  INVITE_ALREADY_USED: "This invite has already been used.",
  INVITE_REVOKED: "This invite was revoked by the workspace owner.",
  INVITE_EMAIL_MISMATCH:
    "This invite was sent to a different email. Sign in with that email to accept it.",

  // HTTP-shape failures
  TOO_MANY_REQUESTS: "You're going a bit fast — please wait a moment and try again.",
  INTERNAL_ERROR: "Something went wrong on our end. Please try again in a moment.",
  VALIDATION_ERROR: "Please double-check the form fields and try again.",
};

/**
 * Resolve the most useful, user-facing message for any thrown value.
 * Always safe to call; never throws.
 */
export function friendlyErrorMessage(err: unknown, fallback?: string): string {
  const apiErr = ApiError.from(err);
  return MESSAGES[apiErr.code] ?? apiErr.message ?? fallback ?? "Something went wrong.";
}

/**
 * Per-call override hook. Lets a feature say "for THIS form,
 * EMAIL_TAKEN should read 'Use a different email to register'."
 */
export function friendlyErrorMessageWithOverrides(
  err: unknown,
  overrides: Record<string, string>,
  fallback?: string,
): string {
  const apiErr = ApiError.from(err);
  return (
    overrides[apiErr.code] ??
    MESSAGES[apiErr.code] ??
    apiErr.message ??
    fallback ??
    "Something went wrong."
  );
}
