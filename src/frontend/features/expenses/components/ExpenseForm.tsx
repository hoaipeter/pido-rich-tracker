"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Spinner } from "@frontend/components/ui/Spinner";
import { ErrorBanner } from "@frontend/components/ui/ErrorBanner";
import { useCreateExpense } from "../hooks/useExpenseMutations";
import { todayIso } from "../lib/format";
import {
  EXPENSE_CATEGORIES,
  newExpenseSchema,
  type NewExpense,
} from "@shared/expenses/schemas";

interface Props {
  onSubmitted?: (expense: NewExpense) => void;
  autoFocus?: boolean;
  compact?: boolean;
}

const fieldClass =
  "mt-1.5 block w-full rounded-lg border border-brand-200 bg-white/90 px-3 py-2 text-sm text-brand-900 shadow-sm transition placeholder:text-brand-400/70 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30";

export function ExpenseForm({ onSubmitted, autoFocus = false, compact = false }: Props) {
  const createExpense = useCreateExpense();
  const amountRef = useRef<HTMLInputElement | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof newExpenseSchema>, unknown, NewExpense>({
    resolver: zodResolver(newExpenseSchema),
    defaultValues: {
      category: "Food",
      date: "", // populated after mount to avoid SSR/CSR drift
      amount: undefined as unknown as number,
      note: null,
    },
  });

  const { ref: amountRegisterRef, ...amountRegister } = register("amount", {
    valueAsNumber: true,
  });

  useEffect(() => {
    reset({
      category: "Food",
      date: todayIso(),
      amount: undefined as unknown as number,
      note: null,
    });
    if (autoFocus) setFocus("amount");
  }, [autoFocus, reset, setFocus]);

  // eslint-disable-next-line react-hooks/refs
  const onSubmit = handleSubmit(async (input) => {
    await createExpense.mutateAsync(input);
    reset({
      category: input.category,
      date: input.date, // preserve date for rapid logging
      amount: undefined as unknown as number,
      note: null,
    });
    onSubmitted?.(input);
    // Refocus amount so the user can immediately log another expense.
    amountRef.current?.focus();
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <div
        className={
          compact
            ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
            : "grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        }
      >
        <div>
          <label
            htmlFor="category"
            className="text-brand-800 block text-sm font-semibold"
          >
            Category
          </label>
          <select id="category" className={fieldClass} {...register("category")}>
            {EXPENSE_CATEGORIES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {errors.category && <FieldError message={errors.category.message} />}
        </div>

        <div>
          <label htmlFor="date" className="text-brand-800 block text-sm font-semibold">
            Date
          </label>
          <input id="date" type="date" className={fieldClass} {...register("date")} />
          {errors.date && <FieldError message={errors.date.message} />}
        </div>

        <div>
          <label htmlFor="amount" className="text-brand-800 block text-sm font-semibold">
            Amount
          </label>
          <input
            id="amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            className={fieldClass}
            {...amountRegister}
            ref={(node) => {
              amountRegisterRef(node);
              amountRef.current = node;
            }}
          />
          {errors.amount && <FieldError message={errors.amount.message} />}
        </div>

        <div>
          <label htmlFor="note" className="text-brand-800 block text-sm font-semibold">
            Note <span className="text-brand-400">(optional)</span>
          </label>
          <input
            id="note"
            type="text"
            placeholder="e.g., Grocery run"
            maxLength={200}
            className={fieldClass}
            {...register("note")}
          />
          {errors.note && <FieldError message={errors.note.message} />}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        {createExpense.isError && (
          <ErrorBanner
            error={createExpense.error}
            clearOn={createExpense.data}
            className="!mt-0"
          />
        )}
        <button
          type="submit"
          disabled={isSubmitting || createExpense.isPending}
          className="from-brand-400 via-brand-500 to-brand-600 focus-visible:ring-brand-500 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br px-5 py-2.5 text-sm font-semibold text-white shadow-[0_6px_18px_-8px_rgba(223,115,150,0.55)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-10px_rgba(223,115,150,0.65)] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {(isSubmitting || createExpense.isPending) && (
            <Spinner className="text-white" />
          )}
          {isSubmitting || createExpense.isPending ? "Saving…" : "Add expense"}
        </button>
      </div>
    </form>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1 text-xs text-rose-600">
      {message}
    </p>
  );
}
