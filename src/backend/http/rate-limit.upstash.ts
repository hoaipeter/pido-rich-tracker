import { env } from "@backend/config/env";
import type { RateLimitStore } from "./rate-limit.store";

/**
 * Upstash Redis REST adapter. Uses fixed-window counting via INCR +
 * EXPIRE — simple, atomic on the Redis side, and good enough for
 * abuse-prevention at the auth surface.
 *
 * The first request in a window does INCR (returns 1) and is then
 * promoted to a TTL'd key with PEXPIRE. Subsequent requests INCR and
 * read the current PTTL. When PTTL reports -1 (no TTL) we re-set it
 * defensively — that path should not be reachable, but keeps the
 * counter from sticking around forever after an Upstash hiccup.
 */
function buildHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}`,
    "Content-Type": "application/json",
  };
}

async function pipeline(
  commands: Array<Array<string | number>>,
  signal?: AbortSignal,
): Promise<unknown[]> {
  const baseUrl = env.UPSTASH_REDIS_REST_URL;
  if (!baseUrl) {
    throw new Error("UPSTASH_REDIS_REST_URL is not configured.");
  }
  const res = await fetch(`${baseUrl.replace(/\/+$/, "")}/pipeline`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(commands),
    signal,
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Upstash error: ${res.status}`);
  }
  const json = (await res.json()) as Array<{ result?: unknown; error?: string }>;
  return json.map((r) => {
    if (r.error) throw new Error(`Upstash error: ${r.error}`);
    return r.result;
  });
}

export function createUpstashStore(): RateLimitStore {
  return {
    async check(key, { max, windowMs }) {
      const ns = `rl:${key}`;
      const ac = new AbortController();
      // Hard cap the rate-limit lookup so a slow Upstash call cannot
      // hold up a request thread.
      const timer = setTimeout(() => ac.abort(), 1500);
      try {
        const [countRaw, pttlRaw] = await pipeline(
          [
            ["INCR", ns],
            ["PTTL", ns],
          ],
          ac.signal,
        );
        let count = Number(countRaw ?? 0);
        let pttl = Number(pttlRaw ?? -1);
        if (count === 1 || pttl < 0) {
          // First hit in this window OR key existed without a TTL —
          // (re)set the expiry so the bucket eventually drains.
          await pipeline([["PEXPIRE", ns, windowMs]]);
          pttl = windowMs;
        }
        const resetAt = Date.now() + Math.max(pttl, 0);
        if (count > max) {
          return { success: false, remaining: 0, resetAt };
        }
        return { success: true, remaining: Math.max(max - count, 0), resetAt };
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
