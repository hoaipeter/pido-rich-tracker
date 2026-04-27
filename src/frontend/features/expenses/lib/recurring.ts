import type { Expense } from "@shared/expenses/schemas";

export type RecurringCadence = "weekly" | "biweekly" | "monthly";

export interface RecurringSeries {
  /** Stable identifier — `${normalizedNote}|${category}|${roundedAmount}`. */
  key: string;
  /** Display name (the note, falling back to the category). */
  label: string;
  category: Expense["category"];
  cadence: RecurringCadence;
  occurrences: Expense[];
  averageAmount: number;
  /** Last observed transaction date (yyyy-mm-dd). */
  lastSeen: string;
  /** Next expected date (yyyy-mm-dd) based on cadence + lastSeen. */
  nextExpected: string;
  /** Median gap in days between observed occurrences. */
  medianGap: number;
}

const MIN_OCCURRENCES = 3;
/** ±5% amount tolerance — same merchant occasionally varies (e.g. tax). */
const AMOUNT_TOLERANCE = 0.05;
const CADENCE_WINDOWS: Array<{ cadence: RecurringCadence; min: number; max: number }> = [
  { cadence: "weekly", min: 6, max: 8 },
  { cadence: "biweekly", min: 13, max: 16 },
  { cadence: "monthly", min: 27, max: 33 },
];

/**
 * Detect recurring expenses (subscriptions, regular bills) by grouping
 * expenses with similar normalized notes + amounts and checking that their
 * inter-arrival times match a known cadence.
 *
 * Pure-client by design — runs over the in-memory expense list. For larger
 * datasets we'd push this to the server, but at <1k rows the cost is
 * negligible and avoids round-trips.
 */
export function detectRecurring(expenses: Expense[]): RecurringSeries[] {
  // Group by (normalizedNote, category). Amount tolerance is enforced per
  // group when we evaluate cadence — a $14.99 vs $15.99 Netflix would
  // still bucket together; the median gap check filters false positives.
  const groups = new Map<string, Expense[]>();
  for (const expense of expenses) {
    const noteKey = normalizeNote(expense.note);
    if (!noteKey) continue; // skip expenses with no note
    const groupKey = `${noteKey}|${expense.category}`;
    const list = groups.get(groupKey) ?? [];
    list.push(expense);
    groups.set(groupKey, list);
  }

  const series: RecurringSeries[] = [];
  for (const [groupKey, group] of groups) {
    if (group.length < MIN_OCCURRENCES) continue;

    // Within each group, split into amount clusters so $9.99 and $89.99 from
    // the same merchant don't get mashed into one cadence test.
    for (const cluster of clusterByAmount(group)) {
      if (cluster.length < MIN_OCCURRENCES) continue;
      const sorted = [...cluster].sort((a, b) => a.date.localeCompare(b.date));
      const gaps = pairwiseGapsDays(sorted);
      const median = medianOf(gaps);
      const cadence = matchCadence(median);
      if (!cadence) continue;

      const sumAmount = sorted.reduce((s, e) => s + e.amount, 0);
      const averageAmount = sumAmount / sorted.length;
      const last = sorted[sorted.length - 1];
      if (!last) continue;
      const nextExpected = addDaysIso(last.date, Math.round(median));

      series.push({
        key: `${groupKey}|${averageAmount.toFixed(2)}`,
        label: last.note?.trim() || last.category,
        category: last.category,
        cadence,
        occurrences: sorted,
        averageAmount,
        lastSeen: last.date,
        nextExpected,
        medianGap: median,
      });
    }
  }

  // Sort highest-impact first: bigger monthly outflow on top.
  return series.sort(
    (a, b) =>
      monthlyImpact(b.averageAmount, b.cadence) -
      monthlyImpact(a.averageAmount, a.cadence),
  );
}

function monthlyImpact(amount: number, cadence: RecurringCadence): number {
  switch (cadence) {
    case "weekly":
      return amount * 4.33;
    case "biweekly":
      return amount * 2.17;
    case "monthly":
      return amount;
  }
}

function normalizeNote(note: string | null | undefined): string | null {
  if (!note) return null;
  // Strip dates/amounts/whitespace so "Netflix #2024-01" and "Netflix #2024-02"
  // collapse to the same key. Lowercase and remove non-alphanumerics.
  const cleaned = note
    .toLowerCase()
    .replace(/\d+/g, "")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length === 0 ? null : cleaned;
}

function clusterByAmount(expenses: Expense[]): Expense[][] {
  // Sort by amount and split when the next item exceeds the running cluster
  // mean by more than the tolerance. Linear single pass is fine here.
  const sorted = [...expenses].sort((a, b) => a.amount - b.amount);
  const clusters: Expense[][] = [];
  let current: Expense[] = [];
  let runningMean = 0;
  for (const expense of sorted) {
    if (current.length === 0) {
      current = [expense];
      runningMean = expense.amount;
      continue;
    }
    const within =
      runningMean > 0 &&
      Math.abs(expense.amount - runningMean) / runningMean <= AMOUNT_TOLERANCE;
    if (within) {
      current.push(expense);
      runningMean = current.reduce((s, e) => s + e.amount, 0) / current.length;
    } else {
      clusters.push(current);
      current = [expense];
      runningMean = expense.amount;
    }
  }
  if (current.length > 0) clusters.push(current);
  return clusters;
}

function pairwiseGapsDays(sorted: Expense[]): number[] {
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i += 1) {
    const prev = sorted[i - 1];
    const next = sorted[i];
    if (!prev || !next) continue;
    gaps.push(daysBetween(prev.date, next.date));
  }
  return gaps;
}

function medianOf(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
  }
  return sorted[mid] ?? 0;
}

function matchCadence(medianGap: number): RecurringCadence | null {
  for (const window of CADENCE_WINDOWS) {
    if (medianGap >= window.min && medianGap <= window.max) {
      return window.cadence;
    }
  }
  return null;
}

function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso}T00:00:00`);
  const to = new Date(`${toIso}T00:00:00`);
  return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

function addDaysIso(dateStr: string, days: number): string {
  const date = new Date(`${dateStr}T00:00:00`);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
