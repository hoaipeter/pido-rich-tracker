const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const compactFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount);
}

export function formatCompactCurrency(amount: number): string {
  return compactFormatter.format(amount);
}

export function formatPercent(value: number, fractionDigits = 0): string {
  return `${value.toFixed(fractionDigits)}%`;
}

export function formatLongDate(dateStr: string): string {
  // Append T00:00:00 so the parser stays in the local timezone.
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatMonth(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function formatShortMonth(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

/** Convert a Date to yyyy-mm-dd in the local timezone. */
export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayIso(): string {
  return toIsoDate(new Date());
}

/** yyyy-mm key derived from a yyyy-mm-dd date string. */
export function getMonthKey(dateStr: string): string {
  return dateStr.slice(0, 7);
}

export function currentMonthKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/** Returns yyyy-mm key for the month N months before the given monthKey. */
export function shiftMonth(monthKey: string, delta: number): string {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year ?? 0, (month ?? 1) - 1 + delta, 1);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** First and last yyyy-mm-dd of a yyyy-mm month. */
export function monthRange(monthKey: string): { from: string; to: string } {
  const [year, month] = monthKey.split("-").map(Number);
  const start = new Date(year ?? 0, (month ?? 1) - 1, 1);
  const end = new Date(year ?? 0, month ?? 1, 0); // day 0 of next month = last day
  return { from: toIsoDate(start), to: toIsoDate(end) };
}

/**
 * Named time-range presets for filter UIs. Returns a {from, to} ISO date
 * pair, both inclusive. `custom` is intentionally not handled here — UIs
 * should fall through to user-entered dateFrom/dateTo when "custom" is
 * selected.
 */
export type TimeRangePreset =
  | "this-month"
  | "last-month"
  | "last-3-months"
  | "last-6-months"
  | "last-12-months"
  | "ytd"
  | "all-time";

export function timeRangePreset(
  id: TimeRangePreset,
): { from: string; to: string } | null {
  const today = new Date();
  switch (id) {
    case "this-month":
      return monthRange(currentMonthKey());
    case "last-month":
      return monthRange(shiftMonth(currentMonthKey(), -1));
    case "last-3-months": {
      const start = monthRange(shiftMonth(currentMonthKey(), -2)).from;
      return { from: start, to: monthRange(currentMonthKey()).to };
    }
    case "last-6-months": {
      const start = monthRange(shiftMonth(currentMonthKey(), -5)).from;
      return { from: start, to: monthRange(currentMonthKey()).to };
    }
    case "last-12-months": {
      const start = monthRange(shiftMonth(currentMonthKey(), -11)).from;
      return { from: start, to: monthRange(currentMonthKey()).to };
    }
    case "ytd":
      return {
        from: `${today.getFullYear()}-01-01`,
        to: toIsoDate(today),
      };
    case "all-time":
      return null;
  }
}

/**
 * Inverse of `timeRangePreset` — given an arbitrary {from, to}, return the
 * preset id whose range exactly matches, or "custom" otherwise. Used to
 * highlight the active preset in the UI.
 */
export function matchTimeRangePreset(range: {
  from?: string;
  to?: string;
}): TimeRangePreset | "custom" {
  if (!range.from && !range.to) return "all-time";
  const presets: TimeRangePreset[] = [
    "this-month",
    "last-month",
    "last-3-months",
    "last-6-months",
    "last-12-months",
    "ytd",
  ];
  for (const id of presets) {
    const r = timeRangePreset(id);
    if (r && r.from === range.from && r.to === range.to) return id;
  }
  return "custom";
}

/**
 * Inclusive list of yyyy-mm month keys covering [from, to]. Used to derive
 * which months a chart should render given an arbitrary date range.
 */
export function monthKeysInRange(from: string, to: string): string[] {
  const start = getMonthKey(from);
  const end = getMonthKey(to);
  const result: string[] = [];
  let cursor = start;
  // Safety cap: don't loop more than 240 months (20 years).
  for (let i = 0; i < 240 && cursor <= end; i += 1) {
    result.push(cursor);
    cursor = shiftMonth(cursor, 1);
  }
  return result;
}
