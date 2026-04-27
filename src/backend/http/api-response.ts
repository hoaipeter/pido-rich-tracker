import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { UnauthorizedError } from "@backend/auth/session";
import { AuthError } from "@backend/modules/users/user.service";
import { FamilyError } from "@backend/modules/families/errors";
import { redact } from "@backend/logging/redact";
import { assertSameOrigin } from "./origin-guard";
import { ForbiddenError, HttpError, TooManyRequestsError } from "./errors";

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface ApiSuccessBody<T> {
  data: T;
}

export function ok<T>(data: T, init?: ResponseInit): NextResponse<ApiSuccessBody<T>> {
  return NextResponse.json({ data }, init);
}

/**
 * Public, shareable response with a short edge cache. Use only for
 * responses with no user-specific data (e.g. invite preview by token).
 */
export function okPublic<T>(
  data: T,
  init?: ResponseInit & { maxAge?: number; swr?: number },
): NextResponse<ApiSuccessBody<T>> {
  const maxAge = init?.maxAge ?? 60;
  const swr = init?.swr ?? 300;
  const res = NextResponse.json({ data }, init);
  res.headers.set(
    "Cache-Control",
    `public, max-age=${maxAge}, stale-while-revalidate=${swr}`,
  );
  return res;
}

export function created<T>(data: T): NextResponse<ApiSuccessBody<T>> {
  return ok(data, { status: 201 });
}

export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

export function fail(
  code: string,
  message: string,
  status: number,
  details?: unknown,
): NextResponse<ApiErrorBody> {
  return NextResponse.json({ error: { code, message, details } }, { status });
}

export function badRequest(message: string, details?: unknown) {
  return fail("BAD_REQUEST", message, 400, details);
}

export function unauthorized(message = "Authentication required") {
  return fail("UNAUTHORIZED", message, 401);
}

export function forbidden(message = "Forbidden") {
  return fail("FORBIDDEN", message, 403);
}

export function notFound(message = "Resource not found") {
  return fail("NOT_FOUND", message, 404);
}

export function conflict(message: string, details?: unknown) {
  return fail("CONFLICT", message, 409, details);
}

export function tooManyRequests(message = "Too many requests") {
  return fail("TOO_MANY_REQUESTS", message, 429);
}

export function serverError(message = "Internal server error") {
  return fail("INTERNAL_ERROR", message, 500);
}

/**
 * Wrap a route handler so it returns a structured JSON error for any
 * thrown exception instead of leaking stack traces. Also stamps a
 * default `Cache-Control: private, no-store` (overridable per-route)
 * and logs slow (>=1000ms) or 5xx requests.
 */
export function withErrorHandler<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>,
): (...args: Args) => Promise<Response> {
  return async (...args: Args) => {
    const started = Date.now();
    const req = args[0] as Request | undefined;
    const method = req?.method ?? "?";
    let pathname = "?";
    try {
      if (req?.url) pathname = new URL(req.url).pathname;
    } catch {
      // Malformed URL in tests — leave pathname as "?".
    }

    const log = (status: number) => {
      const dur = Date.now() - started;
      if (status >= 500 || dur >= 1000) {
        const tag = dur >= 1000 ? "SLOW" : "err";
        console.warn(`[api] ${method} ${pathname} ${status} ${dur}ms ${tag}`);
      }
    };

    // API responses default to `private, no-store` so user-scoped data
    // never lands in shared caches. `okPublic()` opts out per-route.
    const stampCacheControl = (response: Response) => {
      if (!response.headers.has("Cache-Control")) {
        response.headers.set("Cache-Control", "private, no-store");
      }
      return response;
    };

    try {
      // Centralised CSRF-style same-origin guard — runs for every
      // non-GET /api/* route except the Auth.js endpoints (which have
      // their own CSRF). Routes can still opt in to additional checks
      // but cannot accidentally skip this one.
      if (req) assertSameOrigin(req);
      const response = await handler(...args);
      log(response.status);
      return stampCacheControl(response);
    } catch (error) {
      const fallback = (resp: Response) => {
        log(resp.status);
        return stampCacheControl(resp);
      };
      if (error instanceof UnauthorizedError) {
        return fallback(unauthorized(error.message));
      }
      if (error instanceof AuthError) {
        switch (error.code) {
          case "EMAIL_NOT_ALLOWED":
            return fallback(forbidden(error.message));
          case "EMAIL_TAKEN":
            return fallback(conflict(error.message));
          case "INVALID_CREDENTIALS":
            return fallback(unauthorized(error.message));
          case "USER_NOT_FOUND":
            return fallback(notFound(error.message));
          case "SOLE_OWNER":
            return fallback(conflict(error.message));
          default:
            return fallback(badRequest(error.message));
        }
      }
      if (error instanceof FamilyError) {
        switch (error.code) {
          case "NOT_OWNER":
            return fallback(forbidden(error.message));
          case "NOT_MEMBER":
            return fallback(forbidden(error.message));
          case "FAMILY_NOT_FOUND":
            return fallback(notFound(error.message));
          case "INVITE_NOT_FOUND":
            return fallback(notFound(error.message));
          case "STALE_MEMBERSHIP":
            // 401 forces the client to refresh the session.
            return fallback(unauthorized(error.message));
          case "INVITE_EXPIRED":
          case "INVITE_ALREADY_USED":
          case "INVITE_REVOKED":
          case "INVITE_EMAIL_MISMATCH":
            return fallback(fail(error.code, error.message, 410));
          case "ALREADY_MEMBER":
          case "LAST_OWNER":
            return fallback(conflict(error.message));
          case "NO_OP":
            return fallback(badRequest(error.message));
          default:
            return fallback(badRequest(error.message));
        }
      }
      if (error instanceof ZodError) {
        return fallback(badRequest("Invalid request body", error.flatten()));
      }
      if (error instanceof TooManyRequestsError) {
        const resp = tooManyRequests(error.message);
        if (error.retryAfterSeconds) {
          resp.headers.set("Retry-After", String(error.retryAfterSeconds));
        }
        return fallback(resp);
      }
      if (error instanceof ForbiddenError) {
        return fallback(forbidden(error.message));
      }
      if (error instanceof HttpError) {
        return fallback(fail(error.code, error.message, error.status, error.details));
      }
      console.error("[api] unhandled error:", redact(error));
      return fallback(serverError());
    }
  };
}
