import type {
  Goal,
  GoalContribution,
  NewGoal,
  NewGoalContribution,
  UpdateBudgetGoal,
  UpdateSavingsGoal,
} from "@shared/goals/schemas";
import { httpRequest } from "@frontend/lib/http";
import { ApiError } from "@frontend/lib/api-error";

export const goalsApi = {
  list(): Promise<Goal[]> {
    return httpRequest<Goal[]>("/api/goals");
  },
  create(input: NewGoal): Promise<Goal> {
    return httpRequest<Goal>("/api/goals", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  update(id: string, patch: UpdateSavingsGoal | UpdateBudgetGoal): Promise<Goal> {
    return httpRequest<Goal>(`/api/goals/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },
  remove(id: string): Promise<void> {
    return httpRequest<void>(`/api/goals/${id}`, { method: "DELETE" });
  },
  listContributions(goalId: string): Promise<GoalContribution[]> {
    return httpRequest<GoalContribution[]>(`/api/goals/${goalId}/contributions`);
  },
  listAllContributions(): Promise<GoalContribution[]> {
    return httpRequest<GoalContribution[]>("/api/goals/contributions");
  },
  addContribution(goalId: string, input: NewGoalContribution): Promise<GoalContribution> {
    return httpRequest<GoalContribution>(`/api/goals/${goalId}/contributions`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
};

export { ApiError };
