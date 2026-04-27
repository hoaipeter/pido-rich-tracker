/**
 * Defensive log scrubber. Errors from the MongoDB driver, fetch
 * responses, and third-party libraries can carry connection strings,
 * bearer tokens, or session secrets in their `.message` / `.stack` /
 * nested fields. We never want those landing in shared log sinks.
 *
 * The redactor is intentionally simple — pattern-based replacement
 * over a stringified payload — so it cannot mask every conceivable
 * leak. It exists as a last line of defence; route handlers should
 * already be careful about what they pass to `console.*`.
 */

const PATTERNS: Array<{ re: RegExp; replacement: string }> = [
  // mongodb+srv://user:pass@host/...  →  mongodb+srv://[REDACTED]@host/...
  { re: /(mongodb(?:\+srv)?:\/\/)[^@\s/]+@/gi, replacement: "$1[REDACTED]@" },
  // Authorization headers / bearer tokens.
  { re: /(bearer\s+)[A-Za-z0-9._\-+/=]{8,}/gi, replacement: "$1[REDACTED]" },
  { re: /(authorization["'\s:=]+)[A-Za-z0-9._\-+/=]{8,}/gi, replacement: "$1[REDACTED]" },
  // Generic key=value secrets in stringified errors. Conservative —
  // only matches keys that look secret and values without whitespace.
  {
    re: /\b(password|passwd|pwd|secret|token|apikey|api_key|access_key|private_key|client_secret)\b\s*[:=]\s*["']?([^\s"',}]+)/gi,
    replacement: "$1=[REDACTED]",
  },
  // Long base64-ish strings adjacent to "secret"/"token" hints already
  // covered above; raw secret-looking values without context are not
  // redacted because that produces too many false positives.
];

/**
 * Replace likely-sensitive substrings with `[REDACTED]`. Returns the
 * input unchanged when no patterns match, including for non-string
 * inputs which are stringified first.
 */
export function redact(value: unknown): string {
  let text: string;
  if (typeof value === "string") {
    text = value;
  } else if (value instanceof Error) {
    text = `${value.name}: ${value.message}${value.stack ? `\n${value.stack}` : ""}`;
  } else {
    try {
      text = JSON.stringify(value);
    } catch {
      text = String(value);
    }
  }
  for (const { re, replacement } of PATTERNS) {
    text = text.replace(re, replacement);
  }
  return text;
}

/**
 * Console-shaped facade that redacts every argument before forwarding.
 * Used by route plumbing so callers don't have to remember to scrub.
 */
export const safeLog = {
  error(...args: unknown[]) {
     
    console.error(...args.map(redact));
  },
  warn(...args: unknown[]) {
     
    console.warn(...args.map(redact));
  },
  info(...args: unknown[]) {
     
    console.info(...args.map(redact));
  },
};
