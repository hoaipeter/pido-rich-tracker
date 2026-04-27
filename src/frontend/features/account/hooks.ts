"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { signOut, useSession } from "next-auth/react";
import { accountApi } from "./api-client";
import type { UpdateAccountInput } from "@shared/auth/schemas";

/** Update display name + refresh session so the JWT carries the new name. */
export function useUpdateMyName() {
  const queryClient = useQueryClient();
  const { update } = useSession();
  return useMutation({
    mutationFn: (input: UpdateAccountInput) => accountApi.updateName(input),
    onSuccess: async (user) => {
      await update({ name: user.name });
      // Bust roster queries that show the user's name.
      await queryClient.invalidateQueries({ queryKey: ["families"] });
    },
  });
}

/** Hard-delete account, then clear cache and sign out. Server requires the user to retype their own email. */
export function useDeleteAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { confirmEmail: string }) => accountApi.deleteAccount(input),
    onSuccess: () => {
      // Drop every cached query so a brief pre-redirect flash cannot
      // render the previous user's data from React Query's store.
      queryClient.clear();
      void signOut({ callbackUrl: "/signin" });
    },
  });
}
