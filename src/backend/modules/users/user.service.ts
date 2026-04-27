import bcrypt from "bcryptjs";
import { env } from "@backend/config/env";
import { isEmailAllowed, parseAllowlist } from "@backend/auth/allowlist";
import {
  registerSchema,
  type PublicUser,
  type RegisterInput,
} from "@shared/auth/schemas";
import { userRepository, type UserDocument } from "./user.repository";
import { familyService } from "@backend/modules/families/family.service";
import { familyRepository } from "@backend/modules/families/family.repository";
import { familyMemberRepository } from "@backend/modules/families/familyMember.repository";
import { inviteRepository } from "@backend/modules/families/invite.repository";

const BCRYPT_COST = 12;

const allowlist = parseAllowlist(env.AUTH_ALLOWED_EMAILS);

export class AuthError extends Error {
  constructor(
    public readonly code:
      | "EMAIL_NOT_ALLOWED"
      | "EMAIL_TAKEN"
      | "INVALID_CREDENTIALS"
      | "USER_NOT_FOUND"
      | "INVALID_NAME"
      | "SOLE_OWNER",
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

function toPublicUser(doc: UserDocument): PublicUser {
  return {
    id: doc._id.toHexString(),
    email: doc.email,
    name: doc.name ?? "",
    image: doc.image ?? null,
  };
}

export const userService = {
  /** Register a credentials user. Enforces allowlist + unique email. */
  async register(input: RegisterInput): Promise<PublicUser> {
    // Re-validate at the service boundary in case callers bypass HTTP layer.
    const parsed = registerSchema.parse(input);

    if (!isEmailAllowed(parsed.email, allowlist)) {
      throw new AuthError(
        "EMAIL_NOT_ALLOWED",
        "This email is not on the allowlist. Ask the owner to add it.",
      );
    }

    const existing = await userRepository.findByEmail(parsed.email);
    if (existing) {
      throw new AuthError("EMAIL_TAKEN", "An account with this email already exists.");
    }

    const passwordHash = await bcrypt.hash(parsed.password, BCRYPT_COST);
    const created = await userRepository.createCredentialsUser({
      email: parsed.email,
      name: parsed.name,
      passwordHash,
    });

    // Auto-provision personal workspace; failure leaves the account unusable
    // but recoverable on retry.
    await familyService.createPersonalFamilyFor({
      id: created._id.toHexString(),
      name: created.name ?? null,
      email: created.email,
    });

    return toPublicUser(created);
  },

  /**
   * Verify credentials for Auth.js Credentials `authorize`. Throws
   * `INVALID_CREDENTIALS` on any failure to avoid user enumeration.
   */
  async verifyPassword(email: string, password: string): Promise<PublicUser> {
    const user = await userRepository.findByEmail(email);
    if (!user || !user.passwordHash) {
      throw new AuthError("INVALID_CREDENTIALS", "Invalid email or password.");
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new AuthError("INVALID_CREDENTIALS", "Invalid email or password.");
    }
    return toPublicUser(user);
  },

  isAllowed(email: string): boolean {
    return isEmailAllowed(email, allowlist);
  },

  /**
   * Update the signed-in user's display name. Trims to 80 chars and
   * propagates the new name into each family_members row (best-effort).
   */
  async updateName(userId: string, rawName: string): Promise<PublicUser> {
    const name = rawName.trim().slice(0, 80);
    if (name.length === 0) {
      throw new AuthError("INVALID_NAME", "Name cannot be empty.");
    }
    const updated = await userRepository.updateName(userId, name);
    if (!updated) {
      throw new AuthError("USER_NOT_FOUND", "User not found.");
    }
    await familyMemberRepository
      .syncProfileFields(userId, { name })
      .catch((err) => console.warn("[user.updateName] roster sync failed:", err));
    return toPublicUser(updated);
  },

  /**
   * Hard-delete the signed-in user and cascade across every collection
   * that references them. Refuses with `SOLE_OWNER` if the user is the
   * sole owner of any shared workspace — they must transfer ownership
   * first. Solo families are wiped; shared families have the user's
   * membership removed and `families.ownerId` re-pointed if needed.
   * Auth.js `accounts` and `sessions` rows are purged. `createdBy`
   * attribution on expenses/goals/contributions is intentionally left
   * intact as immutable audit data.
   */
  async deleteAccount(userId: string, confirmEmail?: string): Promise<void> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AuthError("USER_NOT_FOUND", "User not found.");
    }

    // Typed-email reconfirmation. Required at the API boundary; works
    // for OAuth-only users (no password) where re-prompting for the
    // password isn't an option. Case-insensitive trim mirrors how we
    // store and compare emails throughout the app.
    const expected = (user.email ?? "").trim().toLowerCase();
    const supplied = (confirmEmail ?? "").trim().toLowerCase();
    if (!expected || supplied !== expected) {
      throw new AuthError(
        "INVALID_CREDENTIALS",
        "Account deletion requires re-typing your email exactly.",
      );
    }

    const memberships = await familyService.listMembershipsForUser(userId);
    for (const m of memberships) {
      if (m.role === "owner") {
        const ownerCount = await familyMemberRepository.countOwners(m.familyId);
        const memberCount = await familyMemberRepository.countMembers(m.familyId);
        if (ownerCount === 1 && memberCount > 1) {
          throw new AuthError(
            "SOLE_OWNER",
            "Cannot delete account: you are the sole owner of a shared workspace. Transfer ownership first.",
          );
        }
        if (memberCount === 1) {
          await familyService.hardDeleteFamily(m.familyId);
        } else {
          await familyService.removeMember(userId, m.familyId, userId);
        }
      } else {
        await familyService.removeMember(userId, m.familyId, userId);
      }
    }

    // Re-point `families.ownerId` for surviving families. SOLE_OWNER
    // guard above guarantees a survivor exists.
    const ownedFamilyIds = await familyRepository.listIdsByOwner(userId);
    for (const familyId of ownedFamilyIds) {
      const roster = await familyMemberRepository.list(familyId);
      const survivor = roster.find((member) => member.role === "owner") ?? roster[0];
      if (survivor) {
        await familyRepository.setOwner(familyId, survivor.userId);
      }
    }

    await inviteRepository.deleteAllByInviter(userId);
    await familyMemberRepository.deleteAllForUser(userId);
    await userRepository.purgeAuthArtifacts(userId);
    await userRepository.deleteById(userId);
  },
};
