import type { NextRequest } from "next/server";
import { updateFamilySchema } from "@shared/families/schemas";
import { auth } from "@backend/auth/auth";
import { UnauthorizedError } from "@backend/auth/session";
import { badRequest, fail, ok, withErrorHandler } from "@backend/http/api-response";
import { familyService } from "@backend/modules/families/family.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * PATCH — rename a family. Owner-only.
 */
export const PATCH = withErrorHandler(
  async (request: NextRequest, context: RouteContext) => {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) throw new UnauthorizedError();
    const { id: familyId } = await context.params;

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return badRequest("Request body must be valid JSON");
    }
    const input = updateFamilySchema.parse(payload);

    const family = await familyService.rename(userId, familyId, input.name);
    return ok(family);
  },
);

/**
 * DELETE — explicitly NOT supported in v1. Deleting a family would
 * orphan every expense / goal row scoped to it, which is hard to undo
 * safely. Owners who want a cleanup path can transfer ownership and
 * then leave; database operators can drop the family doc directly.
 *
 * We return 405 with a stable code so future clients can detect the
 * shape changing without parsing strings.
 */
export const DELETE = withErrorHandler(async () => {
  return fail(
    "NOT_SUPPORTED",
    "Deleting families is not supported. Transfer ownership and leave instead.",
    405,
  );
});
