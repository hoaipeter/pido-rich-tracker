import { describe, expect, it } from "vitest";
import { detectRecurring } from "./recurring";
import type { Expense } from "@shared/expenses/schemas";

function makeExpense(overrides: Partial<Expense>): Expense {
  return {
    id: Math.random().toString(36).slice(2),
    category: "Other",
    date: "2024-01-01",
    amount: 9.99,
    note: null,
    createdBy: "u1",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("detectRecurring", () => {
  it("returns empty list when no notes are present", () => {
    const expenses = [
      makeExpense({ date: "2024-01-15", amount: 10, note: null }),
      makeExpense({ date: "2024-02-15", amount: 10, note: null }),
      makeExpense({ date: "2024-03-15", amount: 10, note: null }),
    ];
    expect(detectRecurring(expenses)).toEqual([]);
  });

  it("detects a monthly subscription with stable amount and note", () => {
    const expenses = [
      makeExpense({ date: "2024-01-05", amount: 9.99, note: "Netflix" }),
      makeExpense({ date: "2024-02-05", amount: 9.99, note: "Netflix" }),
      makeExpense({ date: "2024-03-05", amount: 9.99, note: "Netflix" }),
      makeExpense({ date: "2024-04-05", amount: 9.99, note: "Netflix" }),
    ];
    const series = detectRecurring(expenses);
    expect(series).toHaveLength(1);
    expect(series[0]?.cadence).toBe("monthly");
    expect(series[0]?.occurrences).toHaveLength(4);
    expect(series[0]?.lastSeen).toBe("2024-04-05");
  });

  it("detects a weekly cadence", () => {
    const expenses = [
      makeExpense({ date: "2024-01-01", amount: 5.5, note: "Gym" }),
      makeExpense({ date: "2024-01-08", amount: 5.5, note: "Gym" }),
      makeExpense({ date: "2024-01-15", amount: 5.5, note: "Gym" }),
      makeExpense({ date: "2024-01-22", amount: 5.5, note: "Gym" }),
    ];
    const series = detectRecurring(expenses);
    expect(series[0]?.cadence).toBe("weekly");
  });

  it("ignores groups below the minimum occurrence threshold", () => {
    const expenses = [
      makeExpense({ date: "2024-01-01", amount: 9.99, note: "Spotify" }),
      makeExpense({ date: "2024-02-01", amount: 9.99, note: "Spotify" }),
    ];
    expect(detectRecurring(expenses)).toEqual([]);
  });

  it("ignores irregular gaps that don't match any cadence", () => {
    const expenses = [
      makeExpense({ date: "2024-01-01", amount: 9.99, note: "Random" }),
      makeExpense({ date: "2024-01-20", amount: 9.99, note: "Random" }),
      makeExpense({ date: "2024-03-01", amount: 9.99, note: "Random" }),
      makeExpense({ date: "2024-04-15", amount: 9.99, note: "Random" }),
    ];
    expect(detectRecurring(expenses)).toEqual([]);
  });
});
