import { describe, expect, it } from "vitest";
import { generateInviteToken, hashInviteToken } from "./token";

describe("generateInviteToken", () => {
  it("returns a base64url string of at least 32 chars", () => {
    const token = generateInviteToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    // 32 random bytes → base64url encoding of length 43 (no padding).
    expect(token.length).toBeGreaterThanOrEqual(32);
  });

  it("produces unique tokens across calls", () => {
    const tokens = new Set(Array.from({ length: 100 }, () => generateInviteToken()));
    expect(tokens.size).toBe(100);
  });
});

describe("hashInviteToken", () => {
  it("is deterministic for the same input", () => {
    const token = "abc123";
    expect(hashInviteToken(token)).toBe(hashInviteToken(token));
  });

  it("returns a 64-char lowercase hex string (SHA-256)", () => {
    const hash = hashInviteToken("anything");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("produces different hashes for different tokens", () => {
    expect(hashInviteToken("a")).not.toBe(hashInviteToken("b"));
  });

  it("never returns the raw token", () => {
    const token = generateInviteToken();
    const hash = hashInviteToken(token);
    expect(hash).not.toBe(token);
    expect(hash).not.toContain(token);
  });
});
