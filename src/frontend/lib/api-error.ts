/**
 * Single error class thrown by every frontend api-client. Preserves
 * the server contract (`code`/`message`/`details`/`status`) and
 * surfaces transport failures (offline, abort) as first-class codes.
 */

export type ApiErrorKind =
  | "validation" // 400
  | "auth" // 401
  | "forbidden" // 403
  | "not_found" // 404
  | "conflict" // 409
  | "gone" // 410
  | "rate_limit" // 429
  | "server" // 5xx
  | "network" // fetch threw / offline
  | "unknown";

export interface ApiErrorBody {
  code?: string;
  message?: string;
  details?: unknown;
}

/** Client-only codes (never returned by server) used for transport-level failures. */
export const ClientErrorCodes = {
  Network: "NETWORK_ERROR",
  Offline: "OFFLINE",
  Aborted: "ABORTED",
  InvalidResponse: "INVALID_RESPONSE",
  Unknown: "UNKNOWN",
} as const;

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** Did the request fail before reaching the server? */
  get isNetwork(): boolean {
    return (
      this.code === ClientErrorCodes.Network || this.code === ClientErrorCodes.Offline
    );
  }

  /** Was the request cancelled (e.g. component unmounted, AbortController)? */
  get isAborted(): boolean {
    return this.code === ClientErrorCodes.Aborted;
  }

  /** Should the UI invite the user to retry? */
  get isRetryable(): boolean {
    if (this.isAborted) return false;
    if (this.isNetwork) return true;
    if (this.status >= 500) return true;
    if (this.status === 429) return true;
    return false;
  }

  get kind(): ApiErrorKind {
    if (this.isNetwork) return "network";
    switch (this.status) {
      case 400:
        return "validation";
      case 401:
        return "auth";
      case 403:
        return "forbidden";
      case 404:
        return "not_found";
      case 409:
        return "conflict";
      case 410:
        return "gone";
      case 429:
        return "rate_limit";
      default:
        if (this.status >= 500) return "server";
        return "unknown";
    }
  }

  /** Normalize anything thrown into an ApiError. */
  static from(err: unknown): ApiError {
    if (err instanceof ApiError) return err;
    if (err instanceof DOMException && err.name === "AbortError") {
      return new ApiError(0, ClientErrorCodes.Aborted, "Request was cancelled.");
    }
    if (err instanceof TypeError) {
      // fetch throws TypeError for DNS failure / CORS / offline.
      const offline = typeof navigator !== "undefined" && navigator.onLine === false;
      return new ApiError(
        0,
        offline ? ClientErrorCodes.Offline : ClientErrorCodes.Network,
        offline
          ? "You appear to be offline. Check your connection and try again."
          : "We couldn't reach the server. Check your connection and try again.",
      );
    }
    if (err instanceof Error) {
      return new ApiError(
        0,
        ClientErrorCodes.Unknown,
        err.message || "Something went wrong.",
      );
    }
    return new ApiError(0, ClientErrorCodes.Unknown, "Something went wrong.");
  }
}
