import { ApiError, ClientErrorCodes, type ApiErrorBody } from "./api-error";

interface ApiSuccessEnvelope<T> {
  data: T;
}

interface ApiFailureEnvelope {
  error: ApiErrorBody;
}

/**
 * Single fetch helper. Sets JSON content-type on writes, parses the
 * `{data}`/`{error}` envelope, normalizes every failure to `ApiError`.
 * No auth, no retries, no toasts — those live elsewhere.
 *
 * Hardened defaults:
 * - `credentials: "same-origin"` so the auth cookie never leaks to a
 *   third-party host even if the caller passes an absolute URL.
 * - `cache: "no-store"` for every non-GET so stale POST/PATCH/DELETE
 *   responses can't bleed across users via a shared cache.
 * - Content-Type sniff before `.json()` so a plain-text 502 from a
 *   misbehaving CDN turns into a clean ApiError instead of a `SyntaxError`.
 */
export async function httpRequest<T>(input: string, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? "GET").toUpperCase();
  const isWrite = method !== "GET" && method !== "HEAD";
  let response: Response;
  try {
    response = await fetch(input, {
      ...init,
      credentials: init?.credentials ?? "same-origin",
      cache: init?.cache ?? (isWrite ? "no-store" : init?.cache),
      headers: {
        // JSON content-type only when there's a body (avoid CORS preflight noise).
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        Accept: "application/json",
        ...init?.headers,
      },
    });
  } catch (err) {
    throw ApiError.from(err);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new ApiError(
      response.status,
      ClientErrorCodes.InvalidResponse,
      response.statusText || "The server returned an unexpected response.",
    );
  }

  let body: ApiSuccessEnvelope<T> | ApiFailureEnvelope;
  try {
    body = (await response.json()) as ApiSuccessEnvelope<T> | ApiFailureEnvelope;
  } catch {
    throw new ApiError(
      response.status,
      ClientErrorCodes.InvalidResponse,
      response.statusText || "The server returned an unreadable response.",
    );
  }

  if (!response.ok || (body && typeof body === "object" && "error" in body)) {
    const fail =
      body && "error" in body && body.error
        ? body.error
        : { code: ClientErrorCodes.Unknown, message: "Request failed." };
    throw new ApiError(
      response.status,
      fail.code ?? ClientErrorCodes.Unknown,
      fail.message ?? "Request failed.",
      fail.details,
    );
  }

  return (body as ApiSuccessEnvelope<T>).data;
}
