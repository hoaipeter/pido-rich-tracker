import { z } from "zod";

export const EXPENSE_CATEGORIES = [
  "Food",
  "Transportation",
  "Entertainment",
  "Utilities",
  "Healthcare",
  "Shopping",
  "Other",
] as const;

export const expenseCategorySchema = z.enum(EXPENSE_CATEGORIES);
export type ExpenseCategory = z.infer<typeof expenseCategorySchema>;

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in yyyy-mm-dd format");

export const newExpenseSchema = z.object({
  category: expenseCategorySchema,
  date: isoDateSchema,
  amount: z
    .number({ error: "Amount must be a number" })
    .positive("Amount must be greater than 0")
    .max(1_000_000_000, "Amount is too large"),
  note: z
    .string()
    .trim()
    .max(200, "Note must be 200 characters or fewer")
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null))
    .nullable(),
});

export type NewExpense = z.infer<typeof newExpenseSchema>;

export const expenseSchema = newExpenseSchema.extend({
  id: z.string().min(1),
  createdBy: z.string().min(1),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Expense = z.infer<typeof expenseSchema>;

export const expenseFiltersSchema = z.object({
  categories: z.array(expenseCategorySchema).optional(),
  dateFrom: isoDateSchema.optional(),
  dateTo: isoDateSchema.optional(),
  minAmount: z.coerce.number().nonnegative().optional(),
  maxAmount: z.coerce.number().positive().optional(),
  search: z.string().trim().max(120).optional(),
});

export type ExpenseFilters = z.infer<typeof expenseFiltersSchema>;
