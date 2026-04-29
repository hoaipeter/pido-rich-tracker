"use client";

import { useEffect, useRef, useState } from "react";

import { ApiError } from "@frontend/lib/api-error";

/**
 * Display lifecycle for transient errors. Banner clears after
 * `autoDismissMs`, when `clearOn` changes (e.g. mutation success),
 * or when the user dismisses manually.
 */
export interface UseAutoDismissErrorOptions {
  /** Auto-hide after this many ms. Pass 0 to disable. */
  autoDismissMs?: number;
  /** Hide immediately when this changes (typically `mutation.data`). */
  clearOn?: unknown;
}

export interface AutoDismissErrorState {
  /** The error currently shown (may be `null` if dismissed). */
  visibleError: ApiError | null;
  /** Hide the banner manually (X button). */
  dismiss: () => void;
}

export function useAutoDismissError(
  error: unknown,
  options: UseAutoDismissErrorOptions = {},
): AutoDismissErrorState {
  const { autoDismissMs = 6000, clearOn } = options;

  const [visibleError, setVisibleError] = useState<ApiError | null>(null);
  const lastSeenRef = useRef<unknown>(null);

  // Compare by identity — react-query keeps the same Error instance
  // between retries, so setState only fires once per failure.
  useEffect(() => {
    if (error && error !== lastSeenRef.current) {
      lastSeenRef.current = error;
      setVisibleError(ApiError.from(error));
    } else if (!error) {
      lastSeenRef.current = null;
    }
  }, [error]);

  // Clear when an external success signal fires.
  useEffect(() => {
    if (clearOn !== undefined && clearOn !== null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisibleError(null);
      lastSeenRef.current = null;
    }
  }, [clearOn]);

  // Timed auto-dismiss.
  useEffect(() => {
    if (!visibleError || autoDismissMs <= 0) return;
    const id = window.setTimeout(() => {
      setVisibleError(null);
    }, autoDismissMs);
    return () => window.clearTimeout(id);
  }, [visibleError, autoDismissMs]);

  return {
    visibleError,
    dismiss: () => {
      setVisibleError(null);
      lastSeenRef.current = null;
    },
  };
}
