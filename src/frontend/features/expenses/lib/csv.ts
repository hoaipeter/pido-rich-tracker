import {
  EXPENSE_CATEGORIES,
  newExpenseSchema,
  type Expense,
  type NewExpense,
} from "@shared/expenses/schemas";

const CSV_HEADERS = ["category", "date", "amount", "note"] as const;

/**
 * Serialise expenses to RFC-4180 CSV. Quotes any field containing a comma,
 * double-quote, or line break, and escapes embedded quotes by doubling them.
 *
 * Headers: category,date,amount,note (lowercase). The order matches what
 * `parseExpensesCsv` expects so a round-trip works without configuration.
 */
export function expensesToCsv(expenses: Expense[]): string {
  const lines: string[] = [CSV_HEADERS.join(",")];
  for (const expense of expenses) {
    lines.push(
      [
        escapeCsv(expense.category),
        escapeCsv(expense.date),
        // Use plain decimal — Intl-formatted strings would break re-import.
        escapeCsv(expense.amount.toFixed(2)),
        escapeCsv(expense.note ?? ""),
      ].join(","),
    );
  }
  // CRLF per RFC-4180. Most parsers accept either, but Excel prefers CRLF.
  return lines.join("\r\n") + "\r\n";
}

export interface CsvParseError {
  row: number; // 1-based, excluding header
  message: string;
}

export interface CsvParseResult {
  valid: NewExpense[];
  errors: CsvParseError[];
}

/**
 * Parse CSV text into validated `NewExpense` rows. Each row is run through
 * `newExpenseSchema` so business rules (category enum, date format, positive
 * amount) are enforced consistently with manual entry.
 *
 * Errors are collected per row so callers can show a partial summary instead
 * of failing the whole import. Headers are case-insensitive but must include
 * `category`, `date`, `amount` (note is optional).
 */
export function parseExpensesCsv(text: string): CsvParseResult {
  const records = parseCsvRecords(text);
  if (records.length === 0) {
    return {
      valid: [],
      errors: [{ row: 0, message: "CSV is empty" }],
    };
  }

  const headerRow = records[0]?.map((cell) => cell.trim().toLowerCase()) ?? [];
  const indices = {
    category: headerRow.indexOf("category"),
    date: headerRow.indexOf("date"),
    amount: headerRow.indexOf("amount"),
    note: headerRow.indexOf("note"),
  };
  const missing = (["category", "date", "amount"] as const).filter(
    (key) => indices[key] === -1,
  );
  if (missing.length > 0) {
    return {
      valid: [],
      errors: [
        {
          row: 0,
          message: `Missing required columns: ${missing.join(", ")}`,
        },
      ],
    };
  }

  const valid: NewExpense[] = [];
  const errors: CsvParseError[] = [];

  for (let i = 1; i < records.length; i += 1) {
    const row = records[i];
    if (!row || row.every((cell) => cell.trim() === "")) continue;

    const rawCategory = (row[indices.category] ?? "").trim();
    const rawDate = (row[indices.date] ?? "").trim();
    const rawAmount = (row[indices.amount] ?? "").trim();
    const rawNote = indices.note >= 0 ? (row[indices.note] ?? "").trim() : "";

    // Coerce + normalize before schema parse for friendlier error messages.
    const amount = Number(rawAmount.replace(/[^0-9.-]/g, ""));
    if (rawAmount.length === 0 || Number.isNaN(amount)) {
      errors.push({ row: i, message: `Invalid amount "${rawAmount}"` });
      continue;
    }

    // Match category case-insensitively against the canonical list so
    // "food" / "FOOD" / "Food" all work.
    const matchedCategory = EXPENSE_CATEGORIES.find(
      (option) => option.toLowerCase() === rawCategory.toLowerCase(),
    );
    if (!matchedCategory) {
      errors.push({
        row: i,
        message: `Unknown category "${rawCategory}"`,
      });
      continue;
    }

    const candidate = {
      category: matchedCategory,
      date: rawDate,
      amount,
      note: rawNote.length > 0 ? rawNote : undefined,
    };

    const result = newExpenseSchema.safeParse(candidate);
    if (!result.success) {
      const message = result.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ");
      errors.push({ row: i, message });
      continue;
    }
    valid.push(result.data);
  }

  return { valid, errors };
}

function escapeCsv(value: string): string {
  if (value.length === 0) return "";
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Hand-rolled RFC-4180 parser. Adding papaparse for one feature is overkill;
 * the rules are simple enough to implement correctly in ~30 lines.
 *
 * Supports quoted fields with embedded commas/newlines and `""` to denote a
 * literal double-quote inside a quoted field.
 */
function parseCsvRecords(text: string): string[][] {
  const records: string[][] = [];
  let current: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      current.push(field);
      field = "";
    } else if (char === "\r") {
      // Skip — handled when we see the following \n. If \r isn't followed
      // by \n, treat as a record terminator.
      if (text[i + 1] === "\n") continue;
      current.push(field);
      records.push(current);
      current = [];
      field = "";
    } else if (char === "\n") {
      current.push(field);
      records.push(current);
      current = [];
      field = "";
    } else {
      field += char;
    }
  }

  // Flush trailing record (file may not end with a newline).
  if (field.length > 0 || current.length > 0) {
    current.push(field);
    records.push(current);
  }

  return records;
}
