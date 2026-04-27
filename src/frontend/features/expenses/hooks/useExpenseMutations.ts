"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { expensesApi } from "../api-client";
import type { Expense, NewExpense } from "@shared/expenses/schemas";
import { expenseKeys } from "./useExpenseQueries";

export function useCreateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: NewExpense) => expensesApi.create(input),
    onSuccess: (created) => {
      // Refetch every list — filters could be active so we can't surgically
      // splice without re-evaluating each cached predicate.
      queryClient.invalidateQueries({ queryKey: expenseKeys.all });
      toast.success(`Added ${created.category} expense`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Could not add expense");
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => expensesApi.remove(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: expenseKeys.all });
      const snapshots = queryClient.getQueriesData<Expense[]>({
        queryKey: expenseKeys.all,
      });
      // Optimistic removal across every cached list.
      for (const [key, value] of snapshots) {
        if (Array.isArray(value)) {
          queryClient.setQueryData<Expense[]>(
            key,
            value.filter((expense) => expense.id !== id),
          );
        }
      }
      return { snapshots };
    },
    onError: (error: Error, _id, context) => {
      // Roll back optimistic updates if the request failed.
      if (context?.snapshots) {
        for (const [key, value] of context.snapshots) {
          queryClient.setQueryData(key, value);
        }
      }
      toast.error(error.message || "Could not delete expense");
    },
    onSuccess: () => {
      toast.success("Expense deleted");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.all });
    },
  });
}

export function useBulkCreateExpenses() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (inputs: NewExpense[]) => expensesApi.bulkCreate(inputs),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.all });
      toast.success(
        `Imported ${result.inserted} expense${result.inserted === 1 ? "" : "s"}`,
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || "Import failed");
    },
  });
}
