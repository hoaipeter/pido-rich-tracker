"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { goalsApi } from "../api-client";
import type {
  NewGoal,
  NewGoalContribution,
  UpdateBudgetGoal,
  UpdateSavingsGoal,
} from "@shared/goals/schemas";
import { goalKeys } from "./useGoalQueries";
import { toastError } from "@frontend/lib/toast-error";

export function useCreateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewGoal) => goalsApi.create(input),
    onSuccess: (goal) => {
      queryClient.invalidateQueries({ queryKey: goalKeys.all });
      toast.success(`Created ${goal.kind === "savings" ? "savings goal" : "budget"}`);
    },
    onError: (error: Error) => toastError(error, "Could not create goal"),
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: UpdateSavingsGoal | UpdateBudgetGoal;
    }) => goalsApi.update(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.all });
      toast.success("Goal updated");
    },
    onError: (error: Error) => toastError(error, "Could not update goal"),
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => goalsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.all });
      toast.success("Goal deleted");
    },
    onError: (error: Error) => toastError(error, "Could not delete goal"),
  });
}

export function useAddContribution(goalId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewGoalContribution) => goalsApi.addContribution(goalId, input),
    onSuccess: () => {
      // Invalidate both this goal's contribution list and the unified goals
      // list so progress widgets recompute.
      queryClient.invalidateQueries({ queryKey: goalKeys.contributions(goalId) });
      queryClient.invalidateQueries({ queryKey: goalKeys.list() });
      toast.success("Contribution logged");
    },
    onError: (error: Error) => toastError(error, "Could not log contribution"),
  });
}
