import { describe, expect, it } from "vitest";
import { expensesToCsv, parseExpensesCsv } from "./csv";
import type { Expense } from "@shared/expenses/schemas";

function makeExpense(overrides: Partial<Expense>): Expense {
  return {
    id: "1",
    category: "Food",
    date: "2024-01-01",
    amount: 12.5,
    note: null,
    createdBy: "u1",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("expensesToCsv", () => {
  it("emits header and rows in the canonical order", () => {
    const csv = expensesToCsv([
      makeExpense({ category: "Food", date: "2024-01-01", amount: 5, note: "lunch" }),
    ]);
    expect(csv.split("\r\n")[0]).toBe("category,date,amount,note");
    expect(csv).toContain("Food,2024-01-01,5.00,lunch");
  });

  it("escapes notes that contain commas, quotes, and newlines", () => {
    const csv = expensesToCsv([
      makeExpense({
        note: 'has "quotes", commas, and\na newline',
      }),
    ]);
    expect(csv).toContain('"has ""quotes"", commas, and\na newline"');
  });

  it("round-trips through parseExpensesCsv", () => {
    const expenses = [
      makeExpense({ category: "Food", date: "2024-01-01", amount: 5, note: "lunch" }),
      makeExpense({
        id: "2",
        category: "Other",
        date: "2024-02-15",
        amount: 99,
        note: null,
      }),
    ];
    const csv = expensesToCsv(expenses);
    const result = parseExpensesCsv(csv);
    expect(result.errors).toEqual([]);
    expect(result.valid).toHaveLength(2);
    expect(result.valid[0]?.category).toBe("Food");
    expect(result.valid[0]?.amount).toBe(5);
    expect(result.valid[0]?.note).toBe("lunch");
    expect(result.valid[1]?.note).toBeNull();
  });
});

describe("parseExpensesCsv", () => {
  it("rejects rows with invalid amounts", () => {
    const csv = "category,date,amount,note\nFood,2024-01-01,not-a-number,";
    const result = parseExpensesCsv(csv);
    expect(result.valid).toEqual([]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.message).toMatch(/amount/i);
  });

  it("rejects unknown categories", () => {
    const csv = "category,date,amount,note\nFakeCat,2024-01-01,10,\n";
    const result = parseExpensesCsv(csv);
    expect(result.valid).toEqual([]);
    expect(result.errors[0]?.message).toMatch(/category/i);
  });

  it("matches categories case-insensitively", () => {
    const csv = "category,date,amount,note\nfood,2024-01-01,10,\n";
    const result = parseExpensesCsv(csv);
    expect(result.valid).toHaveLength(1);
    expect(result.valid[0]?.category).toBe("Food");
  });

  it("reports missing required columns", () => {
    const csv = "date,amount\n2024-01-01,5\n";
    const result = parseExpensesCsv(csv);
    expect(result.valid).toEqual([]);
    expect(result.errors[0]?.message).toMatch(/missing/i);
  });

  it("skips empty trailing rows without errors", () => {
    const csv = "category,date,amount,note\nFood,2024-01-01,5,\n\n";
    const result = parseExpensesCsv(csv);
    expect(result.valid).toHaveLength(1);
    expect(result.errors).toEqual([]);
  });
});
