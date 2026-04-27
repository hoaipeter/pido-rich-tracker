/**
 * Domain errors for the families/invites module. Each carries a stable
 * `code` so route handlers can map them to specific HTTP responses
 * without relying on message-string parsing.
 */
export type FamilyErrorCode =
  | "NOT_OWNER"
  | "NOT_MEMBER"
  | "FAMILY_NOT_FOUND"
  | "LAST_OWNER"
  | "ALREADY_MEMBER"
  | "NO_OP"
  | "INVITE_NOT_FOUND"
  | "INVITE_EXPIRED"
  | "INVITE_ALREADY_USED"
  | "INVITE_REVOKED"
  | "INVITE_EMAIL_MISMATCH"
  | "STALE_MEMBERSHIP";

export class FamilyError extends Error {
  constructor(
    public readonly code: FamilyErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "FamilyError";
  }
}
