"use client";

import { useState } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  CardSubtitle,
  CardTitle,
} from "@frontend/components/ui/Card";
import { EmptyState } from "@frontend/components/ui/EmptyState";
import { Spinner } from "@frontend/components/ui/Spinner";
import { useExpenses } from "@frontend/features/expenses/hooks/useExpenseQueries";
import { currentMonthKey } from "@frontend/features/expenses/lib/format";
import type { Goal } from "@shared/goals/schemas";
import { GoalCard } from "../components/GoalCard";
import { GoalForm } from "../components/GoalForm";
import { useAllGoalContributions, useGoals } from "../hooks/useGoalQueries";

type Tab = "all" | "savings" | "budget";

const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "savings", label: "Savings" },
  { id: "budget", label: "Budgets" },
];

export function GoalsView() {
  const [tab, setTab] = useState<Tab>("all");
  const [showForm, setShowForm] = useState(false);

  const goalsQuery = useGoals();
  const contributionsQuery = useAllGoalContributions();
  const expensesQuery = useExpenses();

  const isLoading =
    goalsQuery.isLoading || contributionsQuery.isLoading || expensesQuery.isLoading;

  const goals = goalsQuery.data ?? [];
  const contributions = contributionsQuery.data ?? [];
  const expenses = expensesQuery.data ?? [];
  const monthKey = currentMonthKey();

  const filteredGoals: Goal[] =
    tab === "all" ? goals : goals.filter((goal) => goal.kind === tab);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="bg-gradient-to-r from-brand-600 via-brand-500 to-cream-600 bg-clip-text text-2xl font-bold tracking-tight text-transparent sm:text-3xl">
            Goals
          </h1>
          <p className="text-sm text-brand-700">
            Set savings targets and monthly budget caps. Track progress in one place.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((value) => !value)}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-brand-400 via-brand-500 to-brand-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:-translate-y-0.5"
        >
          {showForm ? "Close" : "+ New goal"}
        </button>
      </header>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create a goal</CardTitle>
            <CardSubtitle>Choose a savings target or a monthly budget cap.</CardSubtitle>
          </CardHeader>
          <CardBody>
            <GoalForm onSubmitted={() => setShowForm(false)} />
          </CardBody>
        </Card>
      )}

      <nav
        className="flex gap-1 rounded-xl bg-brand-50/60 p-1 text-sm"
        aria-label="Goal type"
      >
        {TABS.map((entry) => {
          const active = tab === entry.id;
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => setTab(entry.id)}
              aria-pressed={active}
              className={
                active
                  ? "flex-1 rounded-lg bg-white px-3 py-2 font-semibold text-brand-800 shadow-sm"
                  : "flex-1 rounded-lg px-3 py-2 font-medium text-brand-600 transition hover:bg-white/60"
              }
            >
              {entry.label}
            </button>
          );
        })}
      </nav>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-sm text-brand-700">
          <Spinner /> <span className="ml-2">Loading goals…</span>
        </div>
      ) : filteredGoals.length === 0 ? (
        <EmptyState
          title={tab === "all" ? "No goals yet" : `No ${tab} goals yet`}
          description='Click "+ New goal" to create your first savings target or budget cap.'
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredGoals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              expenses={expenses}
              contributions={contributions}
              monthKey={monthKey}
            />
          ))}
        </div>
      )}
    </div>
  );
}
