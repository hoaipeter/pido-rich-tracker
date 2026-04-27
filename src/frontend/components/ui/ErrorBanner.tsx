"use client";

import { type ReactNode } from "react";

import { ApiError } from "@frontend/lib/api-error";
import { friendlyErrorMessage } from "@frontend/lib/error-messages";
import {
  useAutoDismissError,
  type UseAutoDismissErrorOptions,
} from "@frontend/lib/useAutoDismissError";

export interface ErrorBannerProps extends UseAutoDismissErrorOptions {
  /** The thrown value. Anything; we'll normalize it. */
  error: unknown;
  /** Retry callback. Only shown when the error is retryable. */
  onRetry?: () => void;
  /** Override messages for specific error codes. */
  messageOverrides?: Record<string, string>;
  /** Replace the default friendly message entirely. */
  message?: string;
  /** Slot rendered after the message (e.g. extra link). */
  children?: ReactNode;
  /** Visual style. `subtle` matches the existing inline `text-red-600` style. */
  variant?: "subtle" | "card";
  className?: string;
}

/**
 * Inline error display. Auto-dismisses, classifies retryable errors,
 * translates known codes via the friendly-message catalog. Pass
 * `clearOn={mutation.data}` to dismiss on next success.
 */
export function ErrorBanner({
  error,
  onRetry,
  messageOverrides,
  message,
  children,
  variant = "subtle",
  autoDismissMs,
  clearOn,
  className,
}: ErrorBannerProps) {
  const { visibleError, dismiss } = useAutoDismissError(error, {
    autoDismissMs,
    clearOn,
  });

  if (!visibleError) return null;

  const friendly =
    message ??
    (messageOverrides
      ? (messageOverrides[visibleError.code] ?? friendlyErrorMessage(visibleError))
      : friendlyErrorMessage(visibleError));

  const showRetry = !!onRetry && visibleError.isRetryable;

  if (variant === "subtle") {
    return (
      <div
        role="alert"
        className={[
          "mt-2 flex items-start gap-2 text-sm text-red-600",
          className ?? "",
        ].join(" ")}
      >
        <p className="flex-1">{friendly}</p>
        {showRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="font-semibold text-red-700 underline-offset-2 hover:underline"
          >
            Retry
          </button>
        ) : null}
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss error"
          className="text-red-400 transition hover:text-red-700"
        >
          &times;
        </button>
        {children}
      </div>
    );
  }

  return (
    <div
      role="alert"
      className={[
        "flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800",
        className ?? "",
      ].join(" ")}
    >
      <div className="flex-1">
        <p className="font-medium">{friendly}</p>
        {children}
      </div>
      {showRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md border border-red-300 bg-white px-2 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-100"
        >
          Retry
        </button>
      ) : null}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss error"
        className="text-red-400 transition hover:text-red-700"
      >
        &times;
      </button>
    </div>
  );
}

export interface QueryErrorProps {
  error: unknown;
  /** From `useQuery`'s `refetch`. */
  onRetry: () => void;
  className?: string;
  /** Hide entirely when no error (default true). */
  fallback?: ReactNode;
}

/**
 * Error display for query (list-load) failures. Always shows Retry,
 * never auto-dismisses, uses the larger card variant.
 */
export function QueryError({
  error,
  onRetry,
  className,
  fallback = null,
}: QueryErrorProps) {
  if (!error) return <>{fallback}</>;
  const friendly = friendlyErrorMessage(error);
  const apiErr = ApiError.from(error);
  return (
    <div
      role="alert"
      className={[
        "flex flex-col items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-800",
        className ?? "",
      ].join(" ")}
    >
      <p className="font-medium">{friendly}</p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-md border border-red-300 bg-white px-3 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-100"
      >
        {apiErr.isNetwork ? "Try again" : "Retry"}
      </button>
    </div>
  );
}
