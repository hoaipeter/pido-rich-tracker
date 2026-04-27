import { describe, expect, it } from "vitest";
import { paceForecast } from "./forecast";
import type { Expense } from "@shared/expenses/schemas";

function makeExpense(date: string, amount: number): Expense {
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

describe("paceForecast", () => {
  it("projects to monthly total based on uniform daily pace", () => {
    // 10/day for 10 days in January (31 days). Projection should be ~ 310.
    const expenses: Expense[] = [];
    for (let day = 1; day <= 10; day += 1) {
      const dd = String(day).padStart(2, "0");
      expenses.push(makeExpense(`2024-01-${dd}`, 10));
    }
    const result = paceForecast(expenses, new Date("2024-01-10T12:00:00"));
    expect(result.daysElapsed).toBe(10);
    expect(result.daysInMonth).toBe(31);
    expect(result.spentToDate).toBe(100);
    // Both pace signals agree at 10/day, so projection ≈ 310.
    expect(result.projectedTotal).toBeCloseTo(310, 0);
  });

  it("returns zero projection when no expenses logged", () => {
    const result = paceForecast([], new Date("2024-02-15T00:00:00"));
    expect(result.projectedTotal).toBe(0);
    expect(result.spentToDate).toBe(0);
  });

  it("weights the trailing window so a single early spike doesn't dominate by mid-month", () => {
    // Big spike on day 1 then nothing — projection should be far less than
    // (spike × daysInMonth) by mid-month.
    const expenses = [makeExpense("2024-01-01", 300)];
    const result = paceForecast(expenses, new Date("2024-01-15T12:00:00"));
    // Running pace = 300/15 = 20 → naive projection 620.
    // Window pace (days 9..15) = 0. Blend with weight 0.5 → 10/day → ≈ 310.
    expect(result.projectedTotal).toBeLessThan(400);
    expect(result.projectedTotal).toBeGreaterThan(200);
  });
});
