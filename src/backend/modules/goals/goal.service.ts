import type {
  Goal,
  GoalContribution,
  NewGoal,
  NewGoalContribution,
  UpdateBudgetGoal,
  UpdateSavingsGoal,
} from "@shared/goals/schemas";
import { goalRepository } from "./goal.repository";
import { goalContributionRepository } from "./goalContribution.repository";

/**
 * Goal use cases. Savings + budget goals share one collection.
 * `familyId` scopes; `createdBy` is display attribution only.
 */
export const goalService = {
  list(familyId: string): Promise<Goal[]> {
    return goalRepository.list(familyId);
  },

  get(familyId: string, id: string): Promise<Goal | null> {
    return goalRepository.get(familyId, id);
  },

  create(familyId: string, createdBy: string, input: NewGoal): Promise<Goal> {
    return goalRepository.create(familyId, createdBy, input);
  },

  async update(
    familyId: string,
    id: string,
    patch: UpdateSavingsGoal | UpdateBudgetGoal,
  ): Promise<Goal | null> {
    // Need existing kind to land patch on the correct discriminated branch.
    const existing = await goalRepository.get(familyId, id);
    if (!existing) return null;
    return goalRepository.update(familyId, id, existing.kind, patch);
  },

  async remove(familyId: string, id: string): Promise<boolean> {
    // Verify family ownership before cascading contributions — prevents
    // a forged id from wiping another family's contributions.
    const existing = await goalRepository.get(familyId, id);
    if (!existing) return false;
    await goalContributionRepository.deleteForGoal(familyId, id);
    return goalRepository.delete(familyId, id);
  },

  listContributions(familyId: string, goalId: string): Promise<GoalContribution[]> {
    return goalContributionRepository.listForGoal(familyId, goalId);
  },

  listAllContributions(familyId: string): Promise<GoalContribution[]> {
    return goalContributionRepository.listAll(familyId);
  },

  async addContribution(
    familyId: string,
    createdBy: string,
    goalId: string,
    input: NewGoalContribution,
  ): Promise<GoalContribution | null> {
    // Reject contributions on non-savings goals or out-of-family goals.
    const goal = await goalRepository.get(familyId, goalId);
    if (!goal || goal.kind !== "savings") return null;
    return goalContributionRepository.create(familyId, createdBy, goalId, input);
  },

  removeContribution(familyId: string, id: string): Promise<boolean> {
    return goalContributionRepository.delete(familyId, id);
  },
};

export type GoalService = typeof goalService;
