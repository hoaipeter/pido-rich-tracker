import type { NextRequest } from "next/server";
import { z } from "zod";
import { newExpenseSchema } from "@shared/expenses/schemas";
import { badRequest, created, withErrorHandler } from "@backend/http/api-response";
import { expenseService } from "@backend/modules/expenses";
import { getCurrentFamilyContext } from "@backend/auth/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BULK_ROWS = 5000;

const bulkPayloadSchema = z.object({
  expenses: z
    .array(newExpenseSchema)
    .min(1, "At least one expense is required")
    .max(MAX_BULK_ROWS, `Cannot import more than ${MAX_BULK_ROWS} rows in one request`),
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const { familyId, userId } = await getCurrentFamilyContext();
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return badRequest("Request body must be valid JSON");
  }
  const { expenses } = bulkPayloadSchema.parse(payload);
  const inserted = await expenseService.bulkCreate(familyId, userId, expenses);
  return created({ inserted: inserted.length, expenses: inserted });
});
