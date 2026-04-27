import type {
  BudgetGoal,
  Goal,
  GoalContribution,
  SavingsGoal,
} from "@shared/goals/schemas";
import type { Expense } from "@shared/expenses/schemas";
import { filterByMonth, totalAmount } from "@frontend/features/expenses/lib/analytics";

export interface SavingsProgress {
  kind: "savings";
  contributedTotal: number;
  targetAmount: number;
  /** 0..1 — clamped at 1 when contributions reach or exceed target. */
  percent: number;
  /** Days remaining until the targetDate (negative if past due). */
  daysRemaining: number;
  /** Per-day amount needed to hit `targetDate`. Null when complete or past due. */
  requiredPerDay: number | null;
  /** Recent (last 30d) contribution rate per day. */
  recentRatePerDay: number;
  /** Projected completion based on recent rate. Null with no recent contributions. */
  projectedCompletionDate: string | null;
  status: "ahead" | "on-track" | "behind" | "complete" | "stalled" | "overdue";
}

export interface BudgetProgress {
  kind: "budget";
  monthKey: string;
  spent: number;
  limit: number;
  /** 0..∞ — can exceed 1 when the budget is blown. */
  utilization: number;
  remaining: number;
  status: "under" | "near" | "over" | "inactive";
}

const NEAR_BUDGET_THRESHOLD = 0.85;

export function computeSavingsProgress(
  goal: SavingsGoal,
  contributions: GoalContribution[],
  asOf: Date = new Date(),
): SavingsProgress {
  const filtered = contributions.filter((c) => c.goalId === goal.id);
  const contributedTotal = filtered.reduce((sum, c) => sum + c.amount, 0);
  const percent =
    goal.targetAmount > 0 ? Math.min(1, contributedTotal / goal.targetAmount) : 0;

  const today = isoDate(asOf);
  const target = goal.targetDate;
  const daysRemaining = daysBetween(today, target);

  // Trailing 30-day window for projection — responsive without spike overreaction.
  const windowStart = isoDate(addDays(asOf, -30));
  const recentTotal = filtered
    .filter((c) => c.date >= windowStart && c.date <= today)
    .reduce((sum, c) => sum + c.amount, 0);
  const recentRatePerDay = recentTotal / 30;

  const remaining = Math.max(0, goal.targetAmount - contributedTotal);
  const requiredPerDay =
    daysRemaining > 0 && remaining > 0 ? remaining / daysRemaining : null;

  const projectedCompletionDate =
    remaining > 0 && recentRatePerDay > 0
      ? isoDate(addDays(asOf, Math.ceil(remaining / recentRatePerDay)))
      : null;

  let status: SavingsProgress["status"];
  if (contributedTotal >= goal.targetAmount) {
    status = "complete";
  } else if (daysRemaining < 0) {
    status = "overdue";
  } else if (recentRatePerDay === 0) {
    // No movement in 30 days — stalled, even if technically on pace.
    status = "stalled";
  } else if (requiredPerDay === null || recentRatePerDay >= requiredPerDay) {
    status = recentRatePerDay > (requiredPerDay ?? 0) * 1.1 ? "ahead" : "on-track";
  } else {
    status = "behind";
  }

  return {
    kind: "savings",
    contributedTotal,
    targetAmount: goal.targetAmount,
    percent,
    daysRemaining,
    requiredPerDay,
    recentRatePerDay,
    projectedCompletionDate,
    status,
  };
}

export function computeBudgetProgress(
  goal: BudgetGoal,
  expenses: Expense[],
  monthKey: string,
): BudgetProgress {
  const inWindow =
    monthKey >= goal.startMonth && (!goal.endMonth || monthKey <= goal.endMonth);
  if (!inWindow) {
    return {
      kind: "budget",
      monthKey,
      spent: 0,
      limit: goal.monthlyLimit,
      utilization: 0,
      remaining: goal.monthlyLimit,
      status: "inactive",
    };
  }
  const monthExpenses = filterByMonth(expenses, monthKey).filter(
    (expense) => expense.category === goal.category,
  );
  const spent = totalAmount(monthExpenses);
  const utilization = goal.monthlyLimit > 0 ? spent / goal.monthlyLimit : 0;
  const remaining = goal.monthlyLimit - spent;

  let status: BudgetProgress["status"];
  if (utilization >= 1) status = "over";
  else if (utilization >= NEAR_BUDGET_THRESHOLD) status = "near";
  else status = "under";

  return {
    kind: "budget",
    monthKey,
    spent,
    limit: goal.monthlyLimit,
    utilization,
    remaining,
    status,
  };
}

export function computeGoalProgress(
  goal: Goal,
  context: { expenses: Expense[]; contributions: GoalContribution[]; monthKey: string },
): SavingsProgress | BudgetProgress {
  if (goal.kind === "savings") {
    return computeSavingsProgress(goal, context.contributions);
  }
  return computeBudgetProgress(goal, context.expenses, context.monthKey);
}

function isoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, delta: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + delta);
  return next;
}

function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso}T00:00:00`);
  const to = new Date(`${toIso}T00:00:00`);
  return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}
