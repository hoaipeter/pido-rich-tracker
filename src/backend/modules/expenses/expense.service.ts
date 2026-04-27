import type { Expense, ExpenseFilters, NewExpense } from "@shared/expenses/schemas";
import { expenseRepository } from "./expense.repository";

/** Expense use cases. `familyId` scopes data; `createdBy` is attribution only. */
export const expenseService = {
  list(familyId: string, filters: ExpenseFilters = {}): Promise<Expense[]> {
    return expenseRepository.list(familyId, filters);
  },

  create(familyId: string, createdBy: string, input: NewExpense): Promise<Expense> {
    return expenseRepository.create(familyId, createdBy, input);
  },

  bulkCreate(
    familyId: string,
    createdBy: string,
    inputs: NewExpense[],
  ): Promise<Expense[]> {
    return expenseRepository.bulkCreate(familyId, createdBy, inputs);
  },

  async remove(familyId: string, id: string): Promise<boolean> {
    return expenseRepository.delete(familyId, id);
  },
};

export type ExpenseService = typeof expenseService;
