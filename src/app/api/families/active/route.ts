import type { NextRequest } from "next/server";
import { setActiveFamilySchema } from "@shared/families/schemas";
import { auth } from "@backend/auth/auth";
import { UnauthorizedError } from "@backend/auth/session";
import { badRequest, ok, withErrorHandler } from "@backend/http/api-response";
import { familyService } from "@backend/modules/families/family.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * PATCH — switch the active family for the signed-in user.
 *
 * The new value is persisted on the user document; the client should
 * call `session.update()` afterwards so the JWT picks up `fid` /
 * `role` / `mv` for the newly-active family on the next request.
 */
export const PATCH = withErrorHandler(async (request: NextRequest) => {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new UnauthorizedError();

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return badRequest("Request body must be valid JSON");
  }
  const input = setActiveFamilySchema.parse(payload);

  const family = await familyService.setActiveFamily(userId, input.familyId);
  return ok({ family });
});
