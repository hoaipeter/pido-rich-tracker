import type {
  Family,
  FamilyInvite,
  FamilyMember,
  FamilyRole,
  InvitePreview,
} from "@shared/families/schemas";
import { httpRequest } from "@frontend/lib/http";

// Re-export so existing imports keep working.
export { ApiError } from "@frontend/lib/api-error";

export interface FamilyListItem extends Family {
  role: FamilyRole;
}

export interface FamilyListResponse {
  families: FamilyListItem[];
  activeFamilyId: string | null;
}

export interface CreateInviteResponse {
  invite: FamilyInvite;
  /** Single-use invite URL with raw token — surfaced once, copy on display. */
  inviteUrl: string;
}

export const familiesApi = {
  list(): Promise<FamilyListResponse> {
    return httpRequest<FamilyListResponse>("/api/families");
  },

  create(name: string): Promise<FamilyListItem> {
    return httpRequest<FamilyListItem>("/api/families", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  },

  rename(id: string, name: string): Promise<Family> {
    return httpRequest<Family>(`/api/families/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    });
  },

  setActive(id: string): Promise<{ family: Family }> {
    return httpRequest<{ family: Family }>("/api/families/active", {
      method: "PATCH",
      body: JSON.stringify({ familyId: id }),
    });
  },

  listMembers(id: string): Promise<FamilyMember[]> {
    return httpRequest<FamilyMember[]>(`/api/families/${id}/members`);
  },

  removeMember(id: string, userId: string): Promise<void> {
    return httpRequest<void>(`/api/families/${id}/members/${userId}`, {
      method: "DELETE",
    });
  },

  setMemberRole(id: string, userId: string, role: FamilyRole): Promise<void> {
    return httpRequest<void>(`/api/families/${id}/members/${userId}`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    });
  },

  listInvites(id: string): Promise<FamilyInvite[]> {
    return httpRequest<FamilyInvite[]>(`/api/families/${id}/invites`);
  },

  createInvite(id: string, email: string): Promise<CreateInviteResponse> {
    return httpRequest<CreateInviteResponse>(`/api/families/${id}/invites`, {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  revokeInvite(id: string, inviteId: string): Promise<void> {
    return httpRequest<void>(`/api/families/${id}/invites/${inviteId}`, {
      method: "DELETE",
    });
  },
};

export const invitesApi = {
  preview(token: string): Promise<InvitePreview> {
    return httpRequest<InvitePreview>(
      `/api/invites/${encodeURIComponent(token)}/preview`,
    );
  },

  accept(token: string): Promise<{ familyId: string }> {
    return httpRequest<{ familyId: string }>(
      `/api/invites/${encodeURIComponent(token)}`,
      {
        method: "POST",
      },
    );
  },
};
