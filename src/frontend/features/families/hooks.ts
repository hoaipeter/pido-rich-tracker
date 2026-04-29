"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import {
  familiesApi,
  invitesApi,
  type CreateInviteResponse,
  type FamilyListItem,
  type FamilyListResponse,
} from "./api-client";
import type {
  FamilyInvite,
  FamilyMember,
  FamilyRole,
  InvitePreview,
} from "@shared/families/schemas";
import { STALE } from "@frontend/lib/queryConstants";
import { toastError } from "@frontend/lib/toast-error";

export const familyKeys = {
  all: ["families"] as const,
  list: () => [...familyKeys.all, "list"] as const,
  members: (id: string) => [...familyKeys.all, id, "members"] as const,
  invites: (id: string) => [...familyKeys.all, id, "invites"] as const,
  preview: (token: string) => ["invite-preview", token] as const,
};

export function useFamilies(): UseQueryResult<FamilyListResponse, Error> {
  return useQuery({
    queryKey: familyKeys.list(),
    queryFn: () => familiesApi.list(),
    staleTime: STALE.DEFAULT,
  });
}

export function useFamilyMembers(
  familyId: string | null | undefined,
): UseQueryResult<FamilyMember[], Error> {
  return useQuery({
    queryKey: familyId ? familyKeys.members(familyId) : ["families", "members", "off"],
    queryFn: () => familiesApi.listMembers(familyId as string),
    enabled: Boolean(familyId),
    staleTime: STALE.FAST,
  });
}

export function useFamilyInvites(
  familyId: string | null | undefined,
): UseQueryResult<FamilyInvite[], Error> {
  return useQuery({
    queryKey: familyId ? familyKeys.invites(familyId) : ["families", "invites", "off"],
    queryFn: () => familiesApi.listInvites(familyId as string),
    enabled: Boolean(familyId),
    staleTime: STALE.FAST,
  });
}

export function useInvitePreview(token: string): UseQueryResult<InvitePreview, Error> {
  return useQuery({
    queryKey: familyKeys.preview(token),
    queryFn: () => invitesApi.preview(token),
    retry: false,
    staleTime: STALE.LONG,
  });
}

/**
 * Refresh JWT (`fid`/`role`/`mv`) and wipe query cache after any
 * mutation that changes the active family scope.
 */
function useSessionAndCacheRefresh() {
  const { update } = useSession();
  const queryClient = useQueryClient();
  return async () => {
    await update({});
    await queryClient.invalidateQueries();
  };
}

export function useCreateFamily() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => familiesApi.create(name),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: familyKeys.list() });
    },
  });
}

export function useRenameFamily() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      familiesApi.rename(id, name),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: familyKeys.list() });
    },
  });
}

export function useSetActiveFamily() {
  const refresh = useSessionAndCacheRefresh();
  return useMutation({
    mutationFn: (id: string) => familiesApi.setActive(id),
    onSuccess: async () => {
      await refresh();
    },
    onError: (error) => toastError(error, "Could not switch workspace"),
  });
}

export function useRemoveMember(familyId: string) {
  const queryClient = useQueryClient();
  const refresh = useSessionAndCacheRefresh();
  return useMutation<{ isSelf: boolean }, Error, { userId: string; isSelf: boolean }>({
    mutationFn: ({ userId, isSelf }) =>
      familiesApi.removeMember(familyId, userId).then(() => ({ isSelf })),
    onSuccess: async ({ isSelf }) => {
      void queryClient.invalidateQueries({ queryKey: familyKeys.members(familyId) });
      void queryClient.invalidateQueries({ queryKey: familyKeys.list() });
      // Removing yourself = your active family changed; refresh JWT.
      if (isSelf) {
        await refresh();
      }
    },
  });
}

/**
 * Promote/demote a member. Refreshes the actor's session when they
 * affect their own role so owner-only UI updates immediately.
 */
export function useSetMemberRole(familyId: string) {
  const queryClient = useQueryClient();
  const refresh = useSessionAndCacheRefresh();
  return useMutation<
    { affectsSelf: boolean },
    Error,
    { userId: string; role: FamilyRole; affectsSelf: boolean }
  >({
    mutationFn: ({ userId, role, affectsSelf }) =>
      familiesApi.setMemberRole(familyId, userId, role).then(() => ({ affectsSelf })),
    onSuccess: async ({ affectsSelf }) => {
      void queryClient.invalidateQueries({ queryKey: familyKeys.members(familyId) });
      void queryClient.invalidateQueries({ queryKey: familyKeys.list() });
      if (affectsSelf) {
        await refresh();
      }
    },
  });
}

export function useCreateInvite(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation<CreateInviteResponse, Error, string>({
    mutationFn: (email: string) => familiesApi.createInvite(familyId, email),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: familyKeys.invites(familyId) });
    },
  });
}

export function useRevokeInvite(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (inviteId: string) => familiesApi.revokeInvite(familyId, inviteId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: familyKeys.invites(familyId) });
    },
  });
}

/** Accept an invite and refresh session so navigation sees the new active family. */
export function useAcceptInvite() {
  const refresh = useSessionAndCacheRefresh();
  return useMutation<{ familyId: string }, Error, string>({
    mutationFn: (token: string) => invitesApi.accept(token),
    onSuccess: async () => {
      await refresh();
    },
  });
}

export function useFamily(id: string | null | undefined): FamilyListItem | undefined {
  const { data } = useFamilies();
  if (!id || !data) return undefined;
  return data.families.find((f) => f.id === id);
}
