import { env } from "@backend/config/env";
import { createInviteService } from "./invite.service";

/**
 * Default invite-service instance bound to the app's public URL. Routes
 * import this; tests can construct their own with `createInviteService`.
 */
function resolveAppUrl(): string {
  if (env.APP_URL) return env.APP_URL;
  if (env.AUTH_URL) return env.AUTH_URL;
  return "http://localhost:3000";
}

export const inviteService = createInviteService({ appUrl: resolveAppUrl() });
