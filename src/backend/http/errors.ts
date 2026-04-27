/**
 * Lightweight error class hierarchy for `withErrorHandler` to map onto
 * HTTP responses without each module having to import the response
 * helpers. Keeping these here also avoids a circular import between
 * `api-response.ts` and the guard / limiter helpers it uses.
 */

export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    this.name = "HttpError";
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = "Forbidden") {
    super(403, "FORBIDDEN", message);
    this.name = "ForbiddenError";
  }
}

export class TooManyRequestsError extends HttpError {
  readonly retryAfterSeconds?: number;
  constructor(message = "Too many requests", retryAfterSeconds?: number) {
    super(429, "TOO_MANY_REQUESTS", message);
    this.name = "TooManyRequestsError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}
