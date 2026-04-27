import type { PublicUser, UpdateAccountInput } from "@shared/auth/schemas";
import { httpRequest } from "@frontend/lib/http";

export const accountApi = {
  updateName(input: UpdateAccountInput): Promise<PublicUser> {
    return httpRequest<PublicUser>("/api/account", {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },
  deleteAccount(input: { confirmEmail: string }): Promise<void> {
    return httpRequest<void>("/api/account", {
      method: "DELETE",
      body: JSON.stringify(input),
    });
  },
};
