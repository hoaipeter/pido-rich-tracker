import { describe, expect, it } from "vitest";
import { redact } from "./redact";

describe("redact", () => {
  it("scrubs MongoDB credentials in connection URIs", () => {
    const out = redact(
      "MongoServerSelectionError: connect ECONNREFUSED at mongodb+srv://admin:hunter2@cluster.example.invalid/db",
    );
    expect(out).not.toContain("hunter2");
    expect(out).not.toContain("admin:hunter2");
    expect(out).toContain("[REDACTED]");
  });

  it("scrubs bearer tokens", () => {
    const out = redact("Authorization: Bearer abcdef0123456789tokenvalue");
    expect(out).not.toContain("abcdef0123456789tokenvalue");
    expect(out).toContain("[REDACTED]");
  });

  it("scrubs key=value secrets", () => {
    const out = redact('client_secret="superSecretValue123"');
    expect(out).not.toContain("superSecretValue123");
    expect(out).toContain("[REDACTED]");
  });

  it("redacts Error objects via name/message/stack", () => {
    const err = new Error("failed to connect mongodb://user:pw@db.example.invalid/app");
    const out = redact(err);
    expect(out).not.toContain("user:pw");
  });

  it("returns string input unchanged when no patterns match", () => {
    const out = redact("just a normal log line");
    expect(out).toBe("just a normal log line");
  });

  it("stringifies plain objects", () => {
    const out = redact({ ok: true, message: "hello" });
    expect(out).toContain("hello");
  });
});
