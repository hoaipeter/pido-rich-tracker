import { describe, expect, it } from "vitest";
import { isEmailAllowed, parseAllowlist } from "./allowlist";

describe("parseAllowlist", () => {
  it("splits, trims, lowercases, and drops empties", () => {
    const result = parseAllowlist(" Alice@Example.com, bob@example.com ,, ");
    expect(result).toEqual(["alice@example.com", "bob@example.com"]);
  });

  it("returns an empty list for an empty string", () => {
    expect(parseAllowlist("")).toEqual([]);
    expect(parseAllowlist("   ")).toEqual([]);
  });
});

describe("isEmailAllowed", () => {
  const list = parseAllowlist("alice@example.com, bob@example.com");

  it("matches case-insensitively after trimming", () => {
    expect(isEmailAllowed(" ALICE@example.COM ", list)).toBe(true);
    expect(isEmailAllowed("bob@example.com", list)).toBe(true);
  });

  it("rejects unlisted emails", () => {
    expect(isEmailAllowed("eve@example.com", list)).toBe(false);
  });

  it("rejects empty input", () => {
    expect(isEmailAllowed("", list)).toBe(false);
    expect(isEmailAllowed("   ", list)).toBe(false);
  });

  it("rejects everything when the allowlist is empty", () => {
    expect(isEmailAllowed("alice@example.com", [])).toBe(false);
  });
});
