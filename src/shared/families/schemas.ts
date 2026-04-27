import { z } from "zod";

/**
 * Family group ("workspace") shared between users. `membershipVersion` is
 * bumped on roster changes; the JWT snapshot is re-validated per request
 * for strict revocation when a member is removed.
 */
export interface Family {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  membershipVersion: number;
}

export const familyRoleSchema = z.enum(["owner", "member"]);
export type FamilyRole = z.infer<typeof familyRoleSchema>;

/** One row per (familyId, userId); a user's families = query by userId. */
export interface FamilyMember {
  id: string;
  familyId: string;
  userId: string;
  role: FamilyRole;
  email: string;
  name: string;
  joinedAt: string;
}

export const newFamilySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Family name is required")
    .max(80, "Family name is too long"),
});
export type NewFamily = z.infer<typeof newFamilySchema>;

export const updateFamilySchema = z.object({
  name: z.string().trim().min(1).max(80),
});
export type UpdateFamily = z.infer<typeof updateFamilySchema>;

export const setActiveFamilySchema = z.object({
  familyId: z.string().min(1, "familyId is required"),
});
export type SetActiveFamilyInput = z.infer<typeof setActiveFamilySchema>;

/**
 * Invite lifecycle: created → accepted | revoked | (expired implicitly).
 * Tokens stored as SHA-256 hashes; raw token only in the invite URL.
 */
export const inviteStatusSchema = z.enum(["open", "accepted", "revoked"]);
export type InviteStatus = z.infer<typeof inviteStatusSchema>;

export interface FamilyInvite {
  id: string;
  familyId: string;
  email: string;
  invitedBy: string;
  status: InviteStatus;
  expiresAt: string;
  createdAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
}

export const createInviteSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(254),
});
export type CreateInviteInput = z.infer<typeof createInviteSchema>;

export const acceptInviteSchema = z.object({
  token: z
    .string()
    .trim()
    .min(20, "Invite token is invalid")
    .max(200, "Invite token is invalid"),
});
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;

/** Role change body. Multiple owners are supported (last-owner guard in service). */
export const updateMemberRoleSchema = z.object({
  role: familyRoleSchema,
});
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;

/** Public invite preview for the unauthenticated landing page — narrow on purpose. */
export interface InvitePreview {
  familyName: string;
  inviterName: string;
  email: string;
  expiresAt: string;
}
