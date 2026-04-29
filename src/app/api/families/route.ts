import type { NextRequest } from "next/server";
import { newFamilySchema } from "@shared/families/schemas";
import { auth } from "@backend/auth/auth";
import { UnauthorizedError } from "@backend/auth/session";
import { badRequest, created, ok, withErrorHandler } from "@backend/http/api-response";
import { familyService } from "@backend/modules/families/family.service";
import { userRepository } from "@backend/modules/users/user.repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET — list all families the signed-in user belongs to.
 *
 * Notably this DOES NOT scope by `activeFamilyId` — the workspace
 * switcher needs to see every membership the user has, including
 * families that are not currently active. The active family is sent
 * as a separate field so the UI can render the "current" indicator.
 */
export const GET = withErrorHandler(async () => {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new UnauthorizedError();

  const [families, userDoc] = await Promise.all([
    familyService.listForUser(userId),
    userRepository.findById(userId),
  ]);
  return ok({
    families,
    activeFamilyId: userDoc?.activeFamilyId ?? null,
  });
});

/**
 * POST — create a new family with the signed-in user as owner.
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const session = await auth();
  const userId = session?.user?.id;
  const userEmail = session?.user?.email;
  if (!userId || !userEmail) throw new UnauthorizedError();

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return badRequest("Request body must be valid JSON");
  }
  const input = newFamilySchema.parse(payload);

  const family = await familyService.create(
    { id: userId, name: session.user.name ?? null, email: userEmail },
    input.name,
  );
  return created(family);
});
