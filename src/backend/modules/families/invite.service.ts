import type { FamilyInvite, InvitePreview } from "@shared/families/schemas";
import { normalizeEmail } from "@shared/auth/normalize";
import { generateInviteToken, hashInviteToken } from "@backend/auth/token";
import { familyRepository } from "./family.repository";
import { familyMemberRepository } from "./familyMember.repository";
import { inviteRepository } from "./invite.repository";
import { userRepository } from "@backend/modules/users/user.repository";
import { familyService } from "./family.service";
import { FamilyError } from "./errors";

const INVITE_TTL_DAYS = 7;

function expiresIn(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

export interface CreateInviteResult {
  invite: FamilyInvite;
  /** Raw URL with unhashed token, returned ONCE. Never persisted or logged. */
  inviteUrl: string;
  familyName: string;
  inviterName: string;
}

export interface InviteServiceConfig {
  /** Public origin used to construct invite URLs (e.g. https://pido.app). */
  appUrl: string;
}

export function createInviteService(config: InviteServiceConfig) {
  function buildInviteUrl(token: string): string {
    const base = config.appUrl.replace(/\/$/, "");
    return `${base}/invite/${token}`;
  }

  return {
    /**
     * Create an open invite for `email` to join `familyId`. Owner-only.
     * If an open invite already exists for the same (familyId, email)
     * we'd reject duplicate-member; non-existent users are fine.
     */
    async createInvite(input: {
      familyId: string;
      email: string;
      invitedBy: string;
    }): Promise<CreateInviteResult> {
      const email = normalizeEmail(input.email);
      await familyService.requireOwner(input.invitedBy, input.familyId);

      const family = await familyRepository.findById(input.familyId);
      if (!family) {
        throw new FamilyError("FAMILY_NOT_FOUND", "Family not found.");
      }

      // Reject inviting an existing member (need email → userId map).
      const existingUser = await userRepository.findByEmail(email);
      if (existingUser) {
        const existingMembership = await familyMemberRepository.getMembership(
          input.familyId,
          existingUser._id.toHexString(),
        );
        if (existingMembership) {
          throw new FamilyError(
            "ALREADY_MEMBER",
            "That user is already a member of this family.",
          );
        }
      }

      const inviter = await userRepository.findById(input.invitedBy);
      const inviterName =
        (inviter?.name && inviter.name.trim()) || inviter?.email || "A family member";

      const token = generateInviteToken();
      const tokenHash = hashInviteToken(token);
      const invite = await inviteRepository.create({
        familyId: input.familyId,
        familyName: family.name,
        email,
        invitedBy: input.invitedBy,
        invitedByName: inviterName,
        tokenHash,
        expiresAt: expiresIn(INVITE_TTL_DAYS),
      });

      return {
        invite,
        inviteUrl: buildInviteUrl(token),
        familyName: family.name,
        inviterName,
      };
    },

    /**
     * Public, unauthenticated invite preview. Returns null for
     * unknown / expired / consumed tokens (single "invalid" state).
     */
    async previewByToken(token: string): Promise<InvitePreview | null> {
      const tokenHash = hashInviteToken(token);
      const doc = await inviteRepository.findByTokenHash(tokenHash);
      if (!doc) return null;
      if (doc.status !== "open") return null;
      if (doc.expiresAt.getTime() <= Date.now()) return null;
      return {
        familyName: doc.familyName,
        inviterName: doc.invitedByName,
        email: doc.email,
        expiresAt: doc.expiresAt.toISOString(),
      };
    },

    /**
     * Accept an invite. Session email must match invite email. Marks
     * the invite accepted FIRST (atomic on the doc) so concurrent
     * acceptors lose with INVITE_ALREADY_USED.
     */
    async acceptInvite(input: {
      token: string;
      userId: string;
      userEmail: string;
      userName: string | null;
    }): Promise<{ familyId: string }> {
      const tokenHash = hashInviteToken(input.token);
      const doc = await inviteRepository.findByTokenHash(tokenHash);
      if (!doc) {
        throw new FamilyError("INVITE_NOT_FOUND", "Invite not found.");
      }
      if (doc.status === "accepted") {
        throw new FamilyError("INVITE_ALREADY_USED", "Invite already used.");
      }
      if (doc.status === "revoked") {
        throw new FamilyError("INVITE_REVOKED", "Invite was revoked.");
      }
      if (doc.expiresAt.getTime() <= Date.now()) {
        throw new FamilyError("INVITE_EXPIRED", "Invite has expired.");
      }
      if (normalizeEmail(input.userEmail) !== doc.email) {
        throw new FamilyError(
          "INVITE_EMAIL_MISMATCH",
          "This invite was sent to a different email address.",
        );
      }

      const inviteId = doc._id.toHexString();
      const accepted = await inviteRepository.markAccepted(inviteId, input.userId);
      if (!accepted) {
        throw new FamilyError("INVITE_ALREADY_USED", "Invite is no longer valid.");
      }

      // Idempotent membership add (skip if already a member).
      const existing = await familyMemberRepository.getMembership(
        doc.familyId,
        input.userId,
      );
      if (!existing) {
        await familyMemberRepository.add({
          familyId: doc.familyId,
          userId: input.userId,
          role: "member",
          email: input.userEmail,
          name: input.userName ?? "",
        });
        await familyRepository.bumpMembershipVersion(doc.familyId);
      }

      // Auto-switch to the freshly-joined family.
      await userRepository.setActiveFamily(input.userId, doc.familyId);

      return { familyId: doc.familyId };
    },

    async listOpen(actorId: string, familyId: string): Promise<FamilyInvite[]> {
      // Owner-only in v1. Membership check and list issued in parallel.
      const [membership, invites] = await Promise.all([
        familyService.getMembership(actorId, familyId),
        inviteRepository.listOpen(familyId),
      ]);
      if (!membership) {
        throw new FamilyError("NOT_MEMBER", "You are not a member of this family.");
      }
      if (membership.role !== "owner") {
        throw new FamilyError(
          "NOT_OWNER",
          "Only the family owner can perform this action.",
        );
      }
      return invites;
    },

    async revokeInvite(input: {
      actorId: string;
      familyId: string;
      inviteId: string;
    }): Promise<void> {
      await familyService.requireOwner(input.actorId, input.familyId);
      // Hard-delete — revoking erases the token hash entirely.
      const ok = await inviteRepository.deleteOne(input.inviteId, input.familyId);
      if (!ok) {
        throw new FamilyError("INVITE_NOT_FOUND", "Invite not found.");
      }
    },
  };
}

export type InviteService = ReturnType<typeof createInviteService>;
