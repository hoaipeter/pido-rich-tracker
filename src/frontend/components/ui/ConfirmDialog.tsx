"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@frontend/lib/cn";

export interface ConfirmOptions {
  title?: string;
  /** Message body (ReactNode for inline highlights/code). */
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" styles confirm red (destructive actions). Default "primary". */
  tone?: "primary" | "danger";
}

type Resolver = (value: boolean) => void;

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

interface ActiveDialog extends ConfirmOptions {
  id: number;
  resolve: Resolver;
}

/**
 * App-wide confirm dialog. Replaces `window.confirm` so styling, focus
 * trap, and Esc-to-cancel match the rest of the app.
 *
 * Usage: `if (await confirm({ title, tone: "danger" })) { ... }`
 */
export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<ActiveDialog | null>(null);
  const idRef = useRef(0);
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      idRef.current += 1;
      setActive({ ...options, id: idRef.current, resolve });
    });
  }, []);

  const close = useCallback((result: boolean) => {
    setActive((current) => {
      if (current) current.resolve(result);
      return null;
    });
  }, []);

  // Esc cancels; focus confirm button on open for keyboard Enter.
  useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close(false);
      }
    };
    window.addEventListener("keydown", onKey);
    // Defer focus to next tick so the element is mounted.
    const t = window.setTimeout(() => confirmButtonRef.current?.focus(), 0);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
    };
  }, [active, close]);

  const value = useMemo<ConfirmContextValue>(() => ({ confirm }), [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {active ? (
        <div
          role="presentation"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
          onClick={() => close(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={`confirm-title-${active.id}`}
            aria-describedby={
              active.description ? `confirm-desc-${active.id}` : undefined
            }
            className="w-full max-w-sm rounded-2xl border border-brand-100 bg-white p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2
              id={`confirm-title-${active.id}`}
              className="text-base font-semibold text-brand-900"
            >
              {active.title ?? "Are you sure?"}
            </h2>
            {active.description ? (
              <div
                id={`confirm-desc-${active.id}`}
                className="mt-2 text-sm text-brand-600"
              >
                {active.description}
              </div>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => close(false)}
                className="rounded-md px-3 py-2 text-sm font-medium text-brand-700 transition hover:bg-brand-50"
              >
                {active.cancelLabel ?? "Cancel"}
              </button>
              <button
                ref={confirmButtonRef}
                type="button"
                onClick={() => close(true)}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium text-white transition",
                  active.tone === "danger"
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-brand-600 hover:bg-brand-700",
                )}
              >
                {active.confirmLabel ?? "Confirm"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used inside <ConfirmDialogProvider>");
  }
  return ctx.confirm;
}
