/** Parse the comma-separated allowlist env var (case- and space-tolerant). */
export function parseAllowlist(raw: string): readonly string[] {
  return raw
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);
}

export function isEmailAllowed(email: string, allowlist: readonly string[]): boolean {
  const normalized = email.trim().toLowerCase();
  if (normalized.length === 0) return false;
  return allowlist.includes(normalized);
}
