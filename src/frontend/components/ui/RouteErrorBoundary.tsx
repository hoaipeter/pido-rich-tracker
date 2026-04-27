"use client";

import { useEffect } from "react";

import { friendlyErrorMessage } from "@frontend/lib/error-messages";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
  /** Optional title override. */
  title?: string;
  /** Optional description override; defaults to friendly catalog. */
  description?: string;
}

/**
 * Reusable content for Next.js `error.tsx` files. Keeps render-time
 * crashes scoped to a route segment with a "Try again" remount.
 */
export function RouteErrorBoundary({ error, reset, title, description }: Props) {
  useEffect(() => {
    console.error("[route] error boundary:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-6 py-12 text-center">
      <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">
        Something went wrong
      </p>
      <h1 className="mt-2 text-xl font-bold tracking-tight text-slate-900">
        {title ?? "We couldn't load this page"}
      </h1>
      <p className="mt-2 max-w-md text-sm text-slate-600">
        {description ?? friendlyErrorMessage(error, error.message)}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-5 inline-flex items-center rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
      >
        Try again
      </button>
    </div>
  );
}
