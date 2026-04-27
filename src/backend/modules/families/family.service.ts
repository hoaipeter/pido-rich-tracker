import type { Family, FamilyMember, FamilyRole } from "@shared/families/schemas";
import { familyRepository } from "./family.repository";
import { familyMemberRepository } from "./familyMember.repository";
import { inviteRepository } from "./invite.repository";
import { userRepository } from "@backend/modules/users/user.repository";
import { expenseRepository } from "@backend/modules/expenses/expense.repository";
import { goalRepository } from "@backend/modules/goals/goal.repository";
import { goalContributionRepository } from "@backend/modules/goals/goalContribution.repository";
import { FamilyError } from "./errors";

/** Default workspace name from a user profile. Falls back to email local-part. */
function defaultFamilyName(input: { name?: string | null; email: string }): string {
  const raw = (input.name ?? "").trim();
  const base = raw.length > 0 ? raw : (input.email.split("@")[0] ?? "My");
  const suffix = "'s Workspace";
  const max = 80;
  const truncated =
    base.length + suffix.length > max ? base.slice(0, max - suffix.length) : base;
  return `${truncated}${suffix}`;
}

export interface FamilyContext {
  family: Family;
  membership: FamilyMember;
}

export const familyService = {
  /**
   * Create a personal family for a freshly-registered user and add
   * them as the owner. Idempotent at the user level: callers should
   * only invoke this when `user.activeFamilyId` is null.
   */
  async createPersonalFamilyFor(user: {
    id: string;
    name?: string | null;
    email: string;
  }): Promise<Family> {
    const family = await familyRepository.create({
      name: defaultFamilyName(user),
      ownerId: user.id,
    });
    await familyMemberRepository.add({
      familyId: family.id,
      userId: user.id,
      role: "owner",
      email: user.email,
      name: user.name ?? "",
    });
    await userRepository.setActiveFamily(user.id, family.id);
    return family;
  },

  /**
   * Ensure the user has at least one family and an `activeFamilyId`.
   * Called by the jwt callback on first sign-in. Auto-creates a
   * personal family when the user has no memberships.
   */
  async ensureActiveFamily(user: {
    id: string;
    name?: string | null;
    email: string;
  }): Promise<{ family: Family; role: FamilyRole }> {
    const userDoc = await userRepository.findById(user.id);
    if (userDoc?.activeFamilyId) {
      const membership = await familyMemberRepository.getMembership(
        userDoc.activeFamilyId,
        user.id,
      );
      if (membership) {
        const family = await familyRepository.findById(userDoc.activeFamilyId);
        if (family) return { family, role: membership.role };
      }
      // Active family is stale (deleted or user removed). Fall through.
    }

    const memberships = await familyMemberRepository.listForUser(user.id);
    const first = memberships[0];
    if (first) {
      const family = await familyRepository.findById(first.familyId);
      if (family) {
        await userRepository.setActiveFamily(user.id, family.id);
        return { family, role: first.role };
      }
    }

    const family = await this.createPersonalFamilyFor(user);
    return { family, role: "owner" };
  },

  /**
   * Explicit family creation (POST /api/families). The actor becomes
   * owner. Distinct from `createPersonalFamilyFor`, which is the
   * register/jwt bootstrap and uses a derived default name.
   */
  async create(
    actor: {
      id: string;
      name?: string | null;
      email: string;
    },
    name: string,
  ): Promise<Family & { role: FamilyRole }> {
    const trimmed = name.trim();
    const family = await familyRepository.create({
      name: trimmed,
      ownerId: actor.id,
    });
    await familyMemberRepository.add({
      familyId: family.id,
      userId: actor.id,
      role: "owner",
      email: actor.email,
      name: actor.name ?? "",
    });
    return { ...family, role: "owner" };
  },

  /**
   * List members of a family. Caller must be a member. Issues the
   * auth check and member-list fetch in parallel to save a round-trip.
   */
  async listMembers(actorId: string, familyId: string): Promise<FamilyMember[]> {
    const [membership, members] = await Promise.all([
      this.getMembership(actorId, familyId),
      familyMemberRepository.list(familyId),
    ]);
    if (!membership) {
      throw new FamilyError("NOT_MEMBER", "You are not a member of this family.");
    }
    return members;
  },

  async listForUser(userId: string): Promise<Array<Family & { role: FamilyRole }>> {
    const memberships = await familyMemberRepository.listForUser(userId);
    if (memberships.length === 0) return [];
    const families = await familyRepository.findManyByIds(
      memberships.map((m) => m.familyId),
    );
    const byId = new Map(families.map((f) => [f.id, f]));
    return memberships
      .map((m) => {
        const family = byId.get(m.familyId);
        return family ? { ...family, role: m.role } : null;
      })
      .filter((row): row is Family & { role: FamilyRole } => row !== null);
  },

  /** Return the user's role in `familyId`, or null if not a member. */
  async getMembership(userId: string, familyId: string): Promise<FamilyMember | null> {
    return familyMemberRepository.getMembership(familyId, userId);
  },

  async requireOwner(userId: string, familyId: string): Promise<void> {
    const membership = await this.getMembership(userId, familyId);
    if (!membership) {
      throw new FamilyError("NOT_MEMBER", "You are not a member of this family.");
    }
    if (membership.role !== "owner") {
      throw new FamilyError(
        "NOT_OWNER",
        "Only the family owner can perform this action.",
      );
    }
  },

  async rename(userId: string, familyId: string, name: string): Promise<Family> {
    await this.requireOwner(userId, familyId);
    const updated = await familyRepository.rename(familyId, name);
    if (!updated) {
      throw new FamilyError("FAMILY_NOT_FOUND", "Family not found.");
    }
    // Renaming doesn't bump membership version — roster shape unchanged.
    return updated;
  },

  async setActiveFamily(userId: string, familyId: string): Promise<Family> {
    const membership = await familyMemberRepository.getMembership(familyId, userId);
    if (!membership) {
      throw new FamilyError("NOT_MEMBER", "You are not a member of this family.");
    }
    const family = await familyRepository.findById(familyId);
    if (!family) {
      throw new FamilyError("FAMILY_NOT_FOUND", "Family not found.");
    }
    await userRepository.setActiveFamily(userId, familyId);
    return family;
  },

  /**
   * Remove a member (or self-leave). Refuses to remove the last owner.
   * Bumps `membershipVersion` so the removed member's next request
   * fails the JWT guard with STALE_MEMBERSHIP. Clears the removed
   * user's `activeFamilyId` if it pointed here.
   */
  async removeMember(
    actorId: string,
    familyId: string,
    targetUserId: string,
  ): Promise<void> {
    const actor = await this.getMembership(actorId, familyId);
    if (!actor) {
      throw new FamilyError("NOT_MEMBER", "You are not a member of this family.");
    }
    const isSelf = actorId === targetUserId;
    if (!isSelf && actor.role !== "owner") {
      throw new FamilyError(
        "NOT_OWNER",
        "Only the family owner can remove other members.",
      );
    }
    const target = await this.getMembership(targetUserId, familyId);
    if (!target) {
      throw new FamilyError("NOT_MEMBER", "User is not a member of this family.");
    }
    if (target.role === "owner") {
      const ownerCount = await familyMemberRepository.countOwners(familyId);
      if (ownerCount <= 1) {
        throw new FamilyError(
          "LAST_OWNER",
          "Cannot remove the last owner. Transfer ownership first.",
        );
      }
    }

    await familyMemberRepository.remove(familyId, targetUserId);
    await familyRepository.bumpMembershipVersion(familyId);

    // Clear active family for the removed user if pointing here.
    const targetUser = await userRepository.findById(targetUserId);
    if (targetUser?.activeFamilyId === familyId) {
      await userRepository.setActiveFamily(targetUserId, null);
    }
  },

  /**
   * Promote / demote a member. Multi-owner is allowed. Refuses to
   * demote the last owner. Bumps `membershipVersion`.
   */
  async setMemberRole(
    actorId: string,
    familyId: string,
    targetUserId: string,
    nextRole: FamilyRole,
  ): Promise<void> {
    await this.requireOwner(actorId, familyId);
    const target = await this.getMembership(targetUserId, familyId);
    if (!target) {
      throw new FamilyError("NOT_MEMBER", "User is not a member of this family.");
    }
    if (target.role === nextRole) {
      throw new FamilyError("NO_OP", `Member is already a ${nextRole}.`);
    }
    if (target.role === "owner" && nextRole === "member") {
      const ownerCount = await familyMemberRepository.countOwners(familyId);
      if (ownerCount <= 1) {
        throw new FamilyError(
          "LAST_OWNER",
          "Cannot demote the last owner. Promote another member to owner first.",
        );
      }
    }

    await familyMemberRepository.setRole(familyId, targetUserId, nextRole);
    // `families.ownerId` (canonical creator pointer) is rewritten only
    // by `transferOwnership`, not on every role change.
    await familyRepository.bumpMembershipVersion(familyId);
  },

  /** Transfer ownership to another existing member. Owner becomes member. */
  async transferOwnership(
    actorId: string,
    familyId: string,
    newOwnerUserId: string,
  ): Promise<void> {
    await this.requireOwner(actorId, familyId);
    const target = await this.getMembership(newOwnerUserId, familyId);
    if (!target) {
      throw new FamilyError("NOT_MEMBER", "Target user is not a member of this family.");
    }
    if (newOwnerUserId === actorId) {
      return;
    }
    await familyMemberRepository.setRole(familyId, newOwnerUserId, "owner");
    await familyMemberRepository.setRole(familyId, actorId, "member");
    await familyRepository.setOwner(familyId, newOwnerUserId);
    await familyRepository.bumpMembershipVersion(familyId);
  },

  /** All membership rows for a user across all families. */
  async listMembershipsForUser(userId: string): Promise<FamilyMember[]> {
    return familyMemberRepository.listForUser(userId);
  },

  /**
   * Hard-delete a family and ALL its data. Privileged: no auth check
   * here — callers (currently only `userService.deleteAccount`) are
   * responsible for proving the actor's right to wipe the family.
   * Best-effort sequential; not transactional (Atlas free tier).
   */
  async hardDeleteFamily(familyId: string): Promise<void> {
    await Promise.all([
      expenseRepository.deleteAllForFamily(familyId),
      goalRepository.deleteAllForFamily(familyId),
      goalContributionRepository.deleteAllForFamily(familyId),
      inviteRepository.deleteAllForFamily(familyId),
      familyMemberRepository.deleteAllForFamily(familyId),
    ]);
    await familyRepository.delete(familyId);
  },
};

export { defaultFamilyName as __defaultFamilyNameForTest };
