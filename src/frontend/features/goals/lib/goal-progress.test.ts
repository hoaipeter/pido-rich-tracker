import { describe, expect, it } from "vitest";
import { computeBudgetProgress, computeSavingsProgress } from "./goal-progress";
import type { BudgetGoal, GoalContribution, SavingsGoal } from "@shared/goals/schemas";
import type { Expense } from "@shared/expenses/schemas";

const baseSavings: SavingsGoal = {
  kind: "savings",
  id: "g1",
  name: "Emergency fund",
  note: null,
  targetAmount: 1000,
  targetDate: "2024-12-31",
  startedAt: "2024-01-01",
  createdBy: "u1",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

function makeContribution(overrides: Partial<GoalContribution>): GoalContribution {
  return {
    id: Math.random().toString(36).slice(2),
    goalId: "g1",
    amount: 100,
    date: "2024-06-01",
    note: null,
    createdBy: "u1",
    createdAt: "2024-06-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("computeSavingsProgress", () => {
  it("marks goal as complete when contributions reach target", () => {
    const result = computeSavingsProgress(
      baseSavings,
      [makeContribution({ amount: 1000, date: "2024-06-01" })],
      new Date("2024-06-15T00:00:00"),
    );
    expect(result.status).toBe("complete");
    expect(result.percent).toBe(1);
  });

  it("marks goal as overdue when target date has passed and goal not met", () => {
    const result = computeSavingsProgress(
      baseSavings,
      [makeContribution({ amount: 100, date: "2024-06-01" })],
      new Date("2025-01-15T00:00:00"),
    );
    expect(result.status).toBe("overdue");
  });

  it("flags stalled goals with no recent activity", () => {
    const result = computeSavingsProgress(
      baseSavings,
      [makeContribution({ amount: 100, date: "2024-01-01" })],
      new Date("2024-06-15T00:00:00"),
    );
    expect(result.status).toBe("stalled");
  });

  it("classifies as on-track when recent rate covers required pace", () => {
    // Need 900 over ~199 days ≈ 4.52/day. Add 30 contributions of 5 in the
    // trailing 30 days → recent rate = 5/day.
    const contributions: GoalContribution[] = [];
    for (let day = 0; day < 30; day += 1) {
      const d = new Date("2024-06-15");
      d.setDate(d.getDate() - day);
      contributions.push(
        makeContribution({
          amount: 5,
          date: d.toISOString().slice(0, 10),
        }),
      );
    }
    contributions.push(makeContribution({ amount: 100, date: "2024-01-01" }));
    const result = computeSavingsProgress(
      baseSavings,
      contributions,
      new Date("2024-06-15T00:00:00"),
    );
    expect(["on-track", "ahead"]).toContain(result.status);
  });
});

describe("computeBudgetProgress", () => {
  const baseBudget: BudgetGoal = {
    kind: "budget",
    id: "b1",
    name: "Food cap",
    note: null,
    monthlyLimit: 500,
    category: "Food",
    startMonth: "2024-01",
    endMonth: null,
    createdBy: "u1",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  };

  function expense(date: string, amount: number): Expense {
    return {
      id: `${date}-${amount}`,
      category: "Food",
      date,
      amount,
      note: null,
      createdBy: "u1",
      createdAt: `${date}T00:00:00.000Z`,
      updatedAt: `${date}T00:00:00.000Z`,
    };
  }

  it("returns inactive for months outside the goal window", () => {
    const result = computeBudgetProgress(baseBudget, [], "2023-12");
    expect(result.status).toBe("inactive");
    expect(result.spent).toBe(0);
  });

  it("classifies under budget when utilization < 0.85", () => {
    const result = computeBudgetProgress(
      baseBudget,
      [expense("2024-03-01", 100), expense("2024-03-15", 200)],
      "2024-03",
    );
    expect(result.status).toBe("under");
    expect(result.spent).toBe(300);
    expect(result.remaining).toBe(200);
  });

  it("classifies near budget when utilization between 0.85 and 1", () => {
    const result = computeBudgetProgress(
      baseBudget,
      [expense("2024-03-01", 450)],
      "2024-03",
    );
    expect(result.status).toBe("near");
  });

  it("classifies over budget when utilization >= 1", () => {
    const result = computeBudgetProgress(
      baseBudget,
      [expense("2024-03-01", 550)],
      "2024-03",
    );
    expect(result.status).toBe("over");
    expect(result.remaining).toBe(-50);
  });

  it("ignores expenses that don't match the goal category", () => {
    const offCategory: Expense = {
      ...expense("2024-03-01", 200),
      category: "Other",
    };
    const result = computeBudgetProgress(baseBudget, [offCategory], "2024-03");
    expect(result.spent).toBe(0);
  });
});
