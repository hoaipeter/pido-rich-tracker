import { z } from "zod";
import { expenseCategorySchema } from "@shared/expenses/schemas";

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in yyyy-mm-dd format");

const monthKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, "Month must be in yyyy-mm format");

export const goalKindSchema = z.enum(["savings", "budget"]);
export type GoalKind = z.infer<typeof goalKindSchema>;

const baseFields = {
  name: z.string().trim().min(1, "Name is required").max(80),
  note: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null))
    .nullable(),
};

/** Savings goal: contributions toward a target amount by a target date. */
export const newSavingsGoalSchema = z.object({
  kind: z.literal("savings"),
  ...baseFields,
  targetAmount: z
    .number({ error: "Target amount must be a number" })
    .positive("Target amount must be greater than 0")
    .max(1_000_000_000),
  targetDate: isoDateSchema,
  startedAt: isoDateSchema,
});

/** Budget cap: monthly spend in `category` under `monthlyLimit`; months are yyyy-mm. */
export const newBudgetGoalSchema = z.object({
  kind: z.literal("budget"),
  ...baseFields,
  monthlyLimit: z
    .number({ error: "Monthly limit must be a number" })
    .positive("Monthly limit must be greater than 0")
    .max(1_000_000_000),
  category: expenseCategorySchema,
  startMonth: monthKeySchema,
  endMonth: monthKeySchema.optional().nullable(),
});

export const newGoalSchema = z.discriminatedUnion("kind", [
  newSavingsGoalSchema,
  newBudgetGoalSchema,
]);
export type NewGoal = z.infer<typeof newGoalSchema>;

const persistedFields = {
  id: z.string().min(1),
  createdBy: z.string().min(1),
  createdAt: z.string(),
  updatedAt: z.string(),
};

export const savingsGoalSchema = newSavingsGoalSchema.extend(persistedFields);
export const budgetGoalSchema = newBudgetGoalSchema.extend(persistedFields);
export const goalSchema = z.discriminatedUnion("kind", [
  savingsGoalSchema,
  budgetGoalSchema,
]);
export type SavingsGoal = z.infer<typeof savingsGoalSchema>;
export type BudgetGoal = z.infer<typeof budgetGoalSchema>;
export type Goal = z.infer<typeof goalSchema>;

/** Partial update preserving the discriminator — kind is immutable post-create. */
export const updateSavingsGoalSchema = newSavingsGoalSchema
  .omit({ kind: true })
  .partial();
export const updateBudgetGoalSchema = newBudgetGoalSchema.omit({ kind: true }).partial();
export type UpdateSavingsGoal = z.infer<typeof updateSavingsGoalSchema>;
export type UpdateBudgetGoal = z.infer<typeof updateBudgetGoalSchema>;

/** Logged additions to a savings goal — separate collection for cheap history reads. */
export const newGoalContributionSchema = z.object({
  amount: z
    .number({ error: "Amount must be a number" })
    .positive("Amount must be greater than 0")
    .max(1_000_000_000),
  date: isoDateSchema,
  note: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null))
    .nullable(),
});
export type NewGoalContribution = z.infer<typeof newGoalContributionSchema>;

export const goalContributionSchema = newGoalContributionSchema.extend({
  id: z.string().min(1),
  goalId: z.string().min(1),
  createdBy: z.string().min(1),
  createdAt: z.string(),
});
export type GoalContribution = z.infer<typeof goalContributionSchema>;
