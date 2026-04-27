import { type RegisterInput } from "@shared/auth/schemas";
import { httpRequest } from "@frontend/lib/http";

// Backwards-compat alias: callers used to import `AuthApiError`.
// Now everything is the unified `ApiError`.
export { ApiError as AuthApiError } from "@frontend/lib/api-error";

export const authApi = {
  async register(input: RegisterInput): Promise<void> {
    await httpRequest<void>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
};
