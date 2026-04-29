/** Shared stale-time presets for React Query hooks. */
export const STALE = {
  /** Fast-changing data: rosters, invites. */
  FAST: 15_000,
  /** Standard data: expenses, goals, families. */
  DEFAULT: 30_000,
  /** Rarely-changing data: invite preview. */
  LONG: 60_000,
} as const;
