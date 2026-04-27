import "next-auth";
import "next-auth/jwt";
import type { FamilyRole } from "@shared/families/schemas";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      /** Currently-selected family workspace. Hydrated by jwt callback. */
      activeFamilyId: string;
      /** User's role in the active family. */
      role: FamilyRole;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    /** Active family id (mirrors session.user.activeFamilyId). */
    fid?: string;
    /** Role in the active family. */
    role?: FamilyRole;
    /**
     * Membership version snapshotted at token issuance / refresh.
     * Compared against the family's current `membershipVersion` by the
     * Node-side guard to detect removed members on the very next
     * request, regardless of cookie expiry.
     */
    mv?: number;
  }
}
