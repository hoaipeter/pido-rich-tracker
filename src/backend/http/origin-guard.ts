/**
 * Same-origin guard for browser-driven, state-changing endpoints.
 *
 * Auth.js handles its own CSRF for the routes under `/api/auth/*`
 * (signin, callback, etc.) so this guard skips them. For everything
 * else we require the `Origin` header to match the request host. Modern
 * browsers always include `Origin` on non-GET fetches; non-browser
 * clients (curl, server-to-server) typically omit it, so the guard
 * defaults to "deny when missing" — strict but appropriate because
 * the entire app is browser-targeted.
 *
 * Read methods (GET, HEAD, OPTIONS) are skipped: they do not mutate
 * state and the Origin requirement breaks legitimate same-origin
 * navigations (which omit the header on top-level GETs).
 */

import { ForbiddenError } from "./errors";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function shouldAssertOrigin(method: string, pathname: string): boolean {
  if (SAFE_METHODS.has(method.toUpperCase())) return false;
  if (pathname.startsWith("/api/auth/")) return false;
  // Only guard /api/* — page routes don't accept browser-driven mutations.
  if (!pathname.startsWith("/api/")) return false;
  return true;
}

export function assertSameOrigin(request: Request): void {
  let url: URL;
  try {
    url = new URL(request.url);
  } catch {
    throw new ForbiddenError("Cross-origin requests are not allowed.");
  }
  if (!shouldAssertOrigin(request.method, url.pathname)) return;

  const origin = request.headers.get("origin");
  if (!origin) {
    throw new ForbiddenError("Cross-origin requests are not allowed.");
  }
  let originUrl: URL;
  try {
    originUrl = new URL(origin);
  } catch {
    throw new ForbiddenError("Cross-origin requests are not allowed.");
  }
  if (originUrl.host !== url.host) {
    throw new ForbiddenError("Cross-origin requests are not allowed.");
  }
}
