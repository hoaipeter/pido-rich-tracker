import { describe, expect, it } from "vitest";
import { createRateLimiter } from "./rate-limit";

describe("createRateLimiter", () => {
  it("allows up to max requests then blocks", () => {
    const limiter = createRateLimiter({ max: 3, windowMs: 60_000 });
    const a = limiter.check("ip-1");
    const b = limiter.check("ip-1");
    const c = limiter.check("ip-1");
    const d = limiter.check("ip-1");
    expect(a.success).toBe(true);
    expect(b.success).toBe(true);
    expect(c.success).toBe(true);
    expect(d.success).toBe(false);
    expect(d.remaining).toBe(0);
  });

  it("tracks buckets independently per key", () => {
    const limiter = createRateLimiter({ max: 1, windowMs: 60_000 });
    expect(limiter.check("a").success).toBe(true);
    expect(limiter.check("a").success).toBe(false);
    expect(limiter.check("b").success).toBe(true);
  });

  it("resets the bucket once the window expires", () => {
    const limiter = createRateLimiter({ max: 1, windowMs: 1 });
    expect(limiter.check("c").success).toBe(true);
    // Force reset by advancing wall-clock through a busy-wait. Window of 1ms
    // makes this near-instant in practice.
    const start = Date.now();
    while (Date.now() - start < 5) {
      // burn a few ms
    }
    expect(limiter.check("c").success).toBe(true);
  });
});
