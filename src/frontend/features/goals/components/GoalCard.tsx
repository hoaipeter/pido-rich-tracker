"use client";

import { useState } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  CardSubtitle,
  CardTitle,
} from "@frontend/components/ui/Card";
import type { Goal, GoalContribution } from "@shared/goals/schemas";
import type { Expense } from "@shared/expenses/schemas";
import {
  formatCurrency,
  formatLongDate,
  formatMonth,
} from "@frontend/features/expenses/lib/format";
import { useDeleteGoal } from "../hooks/useGoalMutations";
import { computeBudgetProgress, computeSavingsProgress } from "../lib/goal-progress";
import { ContributeDialog } from "./ContributeDialog";
import { GoalProgressBar } from "./GoalProgressBar";
import { useConfirm } from "@frontend/components/ui/ConfirmDialog";

interface Props {
  goal: Goal;
  expenses: Expense[];
  contributions: GoalContribution[];
  monthKey: string;
}

/** Goal card with progress bar + status. Layout differs per kind (savings/budget). */
export function GoalCard({ goal, expenses, contributions, monthKey }: Props) {
  const [contributing, setContributing] = useState(false);
  const deleteGoal = useDeleteGoal();
  const confirm = useConfirm();

  const handleDelete = async () => {
    const ok = await confirm({
      title: "Delete goal?",
      description: `Delete "${goal.name}"? This can't be undone.`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (ok) {
      deleteGoal.mutate(goal.id);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle>{goal.name}</CardTitle>
            <CardSubtitle>
              {goal.kind === "savings"
                ? `Savings · target ${formatCurrency(goal.targetAmount)} by ${formatLongDate(goal.targetDate)}`
                : `Budget · ${goal.category} · ${formatCurrency(goal.monthlyLimit)}/mo`}
            </CardSubtitle>
          </div>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleteGoal.isPending}
            className="rounded-md p-1.5 text-brand-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
            aria-label={`Delete ${goal.name}`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path d="M3 6h18" />
              <path d="m19 6-1.42 14.17A2 2 0 0 1 15.59 22H8.41a2 2 0 0 1-1.99-1.83L5 6" />
              <path d="M10 11v6" />
              <path d="M14 11v6" />
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      </CardHeader>
      <CardBody>
        {goal.kind === "savings" ? (
          <SavingsBody
            goal={goal}
            contributions={contributions}
            onContribute={() => setContributing(true)}
          />
        ) : (
          <BudgetBody goal={goal} expenses={expenses} monthKey={monthKey} />
        )}
      </CardBody>
      {goal.kind === "savings" && (
        <ContributeDialog
          goalId={goal.id}
          goalName={goal.name}
          open={contributing}
          onClose={() => setContributing(false)}
        />
      )}
    </Card>
  );
}

function SavingsBody({
  goal,
  contributions,
  onContribute,
}: {
  goal: Extract<Goal, { kind: "savings" }>;
  contributions: GoalContribution[];
  onContribute: () => void;
}) {
  const progress = computeSavingsProgress(goal, contributions);
  const tone =
    progress.status === "complete"
      ? "success"
      : progress.status === "behind" || progress.status === "overdue"
        ? "warning"
        : progress.status === "stalled"
          ? "warning"
          : "default";

  const headlineDetail = (() => {
    switch (progress.status) {
      case "complete":
        return "Goal complete!";
      case "overdue":
        return "Past target date.";
      case "stalled":
        return "No contributions in 30 days.";
      case "behind":
        return progress.requiredPerDay
          ? `Need ${formatCurrency(progress.requiredPerDay)}/day to hit target.`
          : "Falling behind pace.";
      case "ahead":
        return progress.projectedCompletionDate
          ? `Ahead of pace — projected to finish by ${formatLongDate(progress.projectedCompletionDate)}.`
          : "Ahead of pace.";
      case "on-track":
        return progress.requiredPerDay
          ? `On track — ~${formatCurrency(progress.requiredPerDay)}/day to finish.`
          : "On track.";
    }
  })();

  return (
    <div className="space-y-3">
      <GoalProgressBar
        value={progress.percent}
        tone={tone}
        ariaLabel={`${Math.round(progress.percent * 100)}% of ${goal.name}`}
      />
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-semibold text-brand-800">
          {formatCurrency(progress.contributedTotal)} /{" "}
          <span className="text-brand-500">{formatCurrency(goal.targetAmount)}</span>
        </span>
        <span className="text-xs text-brand-600">
          {progress.daysRemaining >= 0
            ? `${progress.daysRemaining} day${progress.daysRemaining === 1 ? "" : "s"} left`
            : `${Math.abs(progress.daysRemaining)} day${Math.abs(progress.daysRemaining) === 1 ? "" : "s"} overdue`}
        </span>
      </div>
      <p className="text-xs text-brand-600">{headlineDetail}</p>
      <button
        type="button"
        onClick={onContribute}
        className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-100"
      >
        + Log contribution
      </button>
    </div>
  );
}

function BudgetBody({
  goal,
  expenses,
  monthKey,
}: {
  goal: Extract<Goal, { kind: "budget" }>;
  expenses: Expense[];
  monthKey: string;
}) {
  const progress = computeBudgetProgress(goal, expenses, monthKey);
  const tone =
    progress.status === "over"
      ? "danger"
      : progress.status === "near"
        ? "warning"
        : progress.status === "inactive"
          ? "default"
          : "success";

  const detail =
    progress.status === "inactive"
      ? `Inactive for ${formatMonth(monthKey)} (active ${formatMonth(goal.startMonth)}${goal.endMonth ? ` – ${formatMonth(goal.endMonth)}` : ""}).`
      : progress.status === "over"
        ? `Over by ${formatCurrency(Math.abs(progress.remaining))} this month.`
        : `${formatCurrency(progress.remaining)} remaining this month.`;

  return (
    <div className="space-y-3">
      <GoalProgressBar
        value={progress.utilization}
        displayValue={Math.min(1, progress.utilization)}
        tone={tone}
        ariaLabel={`${Math.round(progress.utilization * 100)}% of ${goal.name}`}
      />
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-semibold text-brand-800">
          {formatCurrency(progress.spent)} /{" "}
          <span className="text-brand-500">{formatCurrency(goal.monthlyLimit)}</span>
        </span>
        <span className="text-xs text-brand-600">
          {Math.round(progress.utilization * 100)}% used
        </span>
      </div>
      <p
        className={
          progress.status === "over"
            ? "text-xs font-medium text-rose-600"
            : "text-xs text-brand-600"
        }
      >
        {detail}
      </p>
    </div>
  );
}
