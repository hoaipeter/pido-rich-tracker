/**
 * In-memory token-bucket rate limiter. Suitable for single-instance
 * deployments and as a baseline for serverless (Vercel will give each
 * warm Lambda its own bucket — not perfect, but better than nothing for
 * the auth surface).
 *
 * For multi-region or high-traffic deployments, swap this for an Upstash
 * Redis ratelimit. The interface is intentionally drop-in compatible:
 *
 *   const result = await limiter.check(key);
 *   if (!result.success) return tooManyRequests();
 */

interface Bucket {
  tokens: number;
  resetAt: number;
}

interface LimiterOptions {
  /** Maximum requests allowed per window. */
  max: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

export interface LimiterResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

export function createRateLimiter(options: LimiterOptions) {
  const { max, windowMs } = options;
  const buckets = new Map<string, Bucket>();

  // Periodic GC so the map can't grow unbounded under abuse. Skipped in
  // test environments to avoid leaking timers.
  if (process.env.NODE_ENV !== "test") {
    const interval = setInterval(() => {
      const now = Date.now();
      for (const [key, bucket] of buckets) {
        if (bucket.resetAt <= now) buckets.delete(key);
      }
    }, windowMs);
    // Prevent the timer from holding the process open.
    interval.unref?.();
  }

  return {
    check(key: string): LimiterResult {
      const now = Date.now();
      const existing = buckets.get(key);
      if (!existing || existing.resetAt <= now) {
        const fresh: Bucket = { tokens: max - 1, resetAt: now + windowMs };
        buckets.set(key, fresh);
        return { success: true, remaining: fresh.tokens, resetAt: fresh.resetAt };
      }
      if (existing.tokens <= 0) {
        return { success: false, remaining: 0, resetAt: existing.resetAt };
      }
      existing.tokens -= 1;
      return {
        success: true,
        remaining: existing.tokens,
        resetAt: existing.resetAt,
      };
    },
  };
}

/**
 * Best-effort client identifier. Vercel sets `x-forwarded-for`; falls
 * back to the remote address header if proxied differently.
 */
export function clientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip") ?? "anonymous";
}

// ---------------------------------------------------------------------------
// Async store-backed limiter (production path)
// ---------------------------------------------------------------------------

import type { RateLimitStore } from "./rate-limit.store";

function createMemoryStore(): RateLimitStore {
  // The async store wraps the same buckets the sync limiter uses. Tests
  // and dev keep using this; production must opt into upstash via env.
  const buckets = new Map<string, Bucket>();
  return {
    async check(key, { max, windowMs }) {
      const now = Date.now();
      const existing = buckets.get(key);
      if (!existing || existing.resetAt <= now) {
        const fresh: Bucket = { tokens: max - 1, resetAt: now + windowMs };
        buckets.set(key, fresh);
        return { success: true, remaining: fresh.tokens, resetAt: fresh.resetAt };
      }
      if (existing.tokens <= 0) {
        return { success: false, remaining: 0, resetAt: existing.resetAt };
      }
      existing.tokens -= 1;
      return { success: true, remaining: existing.tokens, resetAt: existing.resetAt };
    },
  };
}

let cachedStore: RateLimitStore | undefined;

function getStore(): RateLimitStore {
  if (cachedStore) return cachedStore;
  // Lazy env access: the test suite for the in-memory limiter must run
  // without provisioning the full env, so we only resolve the backend
  // when something actually calls into the async limiter.
   
  const { env } = require("@backend/config/env") as typeof import("@backend/config/env");
  if (env.RATE_LIMIT_BACKEND === "upstash") {
     
    const { createUpstashStore } = require("./rate-limit.upstash") as {
      createUpstashStore: () => RateLimitStore;
    };
    cachedStore = createUpstashStore();
  } else {
    cachedStore = createMemoryStore();
  }
  return cachedStore;
}

/** Test-only override. */
export function __setRateLimitStore(store: RateLimitStore | undefined) {
  cachedStore = store;
}

export interface AsyncLimiter {
  check(key: string): Promise<LimiterResult>;
}

/**
 * Async limiter factory. Produces a limiter bound to the configured
 * backend (memory in dev/test, Upstash in production). `name` is
 * combined into the key so different limiters cannot collide.
 */
export function getRateLimiter(name: string, options: LimiterOptions): AsyncLimiter {
  return {
    async check(key: string) {
      return getStore().check(`${name}:${key}`, options);
    },
  };
}
