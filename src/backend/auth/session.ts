import { auth } from "./auth";
import { familyRepository } from "@backend/modules/families/family.repository";
import { familyMemberRepository } from "@backend/modules/families/familyMember.repository";
import { FamilyError } from "@backend/modules/families/errors";
import type { FamilyRole } from "@shared/families/schemas";

export class UnauthorizedError extends Error {
  constructor(message = "Authentication required") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/** Single chokepoint for current user id. Throws `UnauthorizedError` (→ 401). */
export async function getCurrentUserId(): Promise<string> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    throw new UnauthorizedError();
  }
  return userId;
}

export async function getCurrentSession() {
  return auth();
}

export interface CurrentFamilyContext {
  userId: string;
  familyId: string;
  role: FamilyRole;
}

/**
 * Strict revocation chokepoint. Every Node-side family-scoped handler
 * MUST go through this (or `getCurrentFamilyId`). Re-validates live
 * membership on each call — removed members are rejected even with a
 * still-valid cookie. Edge middleware can't do this (no Mongo).
 */
export async function getCurrentFamilyContext(): Promise<CurrentFamilyContext> {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) {
    throw new UnauthorizedError();
  }
  const familyId = user.activeFamilyId;
  if (!familyId) {
    // Cookie is valid but the token has no active family — force re-login
    // so the jwt callback can rebuild the workspace pointer.
    throw new UnauthorizedError("No active family in session.");
  }

  // Live revocation gate: the membership lookup IS the check. A removed
  // member sees `membership === null` regardless of JWT freshness.
  const [family, membership] = await Promise.all([
    familyRepository.findById(familyId),
    familyMemberRepository.getMembership(familyId, user.id),
  ]);

  if (!family || !membership) {
    throw new FamilyError(
      "STALE_MEMBERSHIP",
      "Your access to this family has been revoked. Sign in again.",
    );
  }

  return {
    userId: user.id,
    familyId,
    role: membership.role,
  };
}

/** Convenience: just the family id, with the same guard semantics. */
export async function getCurrentFamilyId(): Promise<string> {
  const ctx = await getCurrentFamilyContext();
  return ctx.familyId;
}

/** Throws `FamilyError("NOT_OWNER")` when the caller isn't the owner. */
export async function requireOwnerOfCurrentFamily(): Promise<CurrentFamilyContext> {
  const ctx = await getCurrentFamilyContext();
  if (ctx.role !== "owner") {
    throw new FamilyError("NOT_OWNER", "Only the family owner can do this.");
  }
  return ctx;
}
