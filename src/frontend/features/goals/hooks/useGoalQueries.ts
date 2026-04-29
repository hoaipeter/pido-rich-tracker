"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { goalsApi } from "../api-client";
import type { Goal, GoalContribution } from "@shared/goals/schemas";
import { STALE } from "@frontend/lib/queryConstants";

export const goalKeys = {
  all: ["goals"] as const,
  list: () => [...goalKeys.all, "list"] as const,
  contributions: (goalId?: string) =>
    [...goalKeys.all, "contributions", goalId ?? "all"] as const,
};

export function useGoals(): UseQueryResult<Goal[], Error> {
  return useQuery({
    queryKey: goalKeys.list(),
    queryFn: () => goalsApi.list(),
    staleTime: STALE.DEFAULT,
  });
}

export function useGoalContributions(
  goalId: string,
): UseQueryResult<GoalContribution[], Error> {
  return useQuery({
    queryKey: goalKeys.contributions(goalId),
    queryFn: () => goalsApi.listContributions(goalId),
    staleTime: STALE.DEFAULT,
    enabled: Boolean(goalId),
  });
}

export function useAllGoalContributions(): UseQueryResult<GoalContribution[], Error> {
  return useQuery({
    queryKey: goalKeys.contributions(),
    queryFn: () => goalsApi.listAllContributions(),
    staleTime: STALE.DEFAULT,
  });
}
