"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Spinner } from "@frontend/components/ui/Spinner";
import {
  newGoalContributionSchema,
  type NewGoalContribution,
} from "@shared/goals/schemas";
import { useAddContribution } from "../hooks/useGoalMutations";
import { todayIso } from "@frontend/features/expenses/lib/format";

interface Props {
  goalId: string;
  goalName: string;
  open: boolean;
  onClose: () => void;
}

const fieldClass =
  "mt-1.5 block w-full rounded-lg border border-brand-200 bg-white/90 px-3 py-2 text-sm text-brand-900 shadow-sm transition placeholder:text-brand-400/70 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30";

/** Modal for logging a contribution to a savings goal. */
export function ContributeDialog({ goalId, goalName, open, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  const addContribution = useAddContribution(goalId);
  const firstFieldRef = useRef<HTMLInputElement | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof newGoalContributionSchema>, unknown, NewGoalContribution>({
    resolver: zodResolver(newGoalContributionSchema),
    defaultValues: {
      amount: undefined as unknown as number,
      date: todayIso(),
      note: null,
    },
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(open);
    if (open) {
      reset({
        amount: undefined as unknown as number,
        date: todayIso(),
        note: null,
      });
      // Defer focus until after the transition starts.
      const t = setTimeout(() => firstFieldRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open, reset]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted && !open) return null;
  // Guard SSR — `document` only exists once the client mounts.
  if (typeof document === "undefined") return null;

  const onSubmit = handleSubmit(async (input) => {
    await addContribution.mutateAsync(input);
    onClose();
  });

  const { ref: amountRefInner, ...amountRegister } = register("amount", {
    valueAsNumber: true,
  });

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Log contribution to ${goalName}`}
      className="fixed inset-0 z-40 flex items-center justify-center px-4"
    >
      <div
        className="bg-brand-900/30 absolute inset-0 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-brand-800 text-lg font-semibold">Log contribution</h2>
        <p className="text-brand-600 mt-1 text-sm">to {goalName}</p>

        <form onSubmit={onSubmit} noValidate className="mt-4 grid gap-3">
          <div>
            <label
              htmlFor="amount"
              className="text-brand-800 block text-sm font-semibold"
            >
              Amount
            </label>
            <input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              className={fieldClass}
              {...amountRegister}
              ref={(node) => {
                amountRefInner(node);
                firstFieldRef.current = node;
              }}
            />
            {errors.amount && (
              <p role="alert" className="mt-1 text-xs text-rose-600">
                {errors.amount.message}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="date" className="text-brand-800 block text-sm font-semibold">
              Date
            </label>
            <input id="date" type="date" className={fieldClass} {...register("date")} />
          </div>
          <div>
            <label htmlFor="note" className="text-brand-800 block text-sm font-semibold">
              Note <span className="text-brand-400">(optional)</span>
            </label>
            <input
              id="note"
              type="text"
              maxLength={200}
              className={fieldClass}
              {...register("note")}
            />
          </div>

          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-brand-700 hover:bg-brand-50 rounded-lg px-4 py-2 text-sm font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || addContribution.isPending}
              className="from-brand-400 via-brand-500 to-brand-600 inline-flex items-center gap-2 rounded-lg bg-gradient-to-br px-4 py-2 text-sm font-semibold text-white shadow transition hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {(isSubmitting || addContribution.isPending) && (
                <Spinner className="text-white" />
              )}
              Log contribution
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
