"use client";

import { useForm, type UseFormRegister } from "react-hook-form";
import { Spinner } from "@frontend/components/ui/Spinner";
import { EXPENSE_CATEGORIES } from "@shared/expenses/schemas";
import {
  goalKindSchema,
  newBudgetGoalSchema,
  newGoalSchema,
  newSavingsGoalSchema,
  type GoalKind,
  type NewGoal,
} from "@shared/goals/schemas";
import { useCreateGoal } from "../hooks/useGoalMutations";
import { currentMonthKey, todayIso } from "@frontend/features/expenses/lib/format";

interface Props {
  onSubmitted?: () => void;
}

const fieldClass =
  "mt-1.5 block w-full rounded-lg border border-brand-200 bg-white/90 px-3 py-2 text-sm text-brand-900 shadow-sm transition placeholder:text-brand-400/70 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30";

interface SavingsFormValues {
  kind: "savings";
  name: string;
  note: string;
  targetAmount: number;
  targetDate: string;
  startedAt: string;
}

interface BudgetFormValues {
  kind: "budget";
  name: string;
  note: string;
  monthlyLimit: number;
  category: (typeof EXPENSE_CATEGORIES)[number];
  startMonth: string;
  endMonth: string;
}

type FormValues = SavingsFormValues | BudgetFormValues;

/** Goal creation form. Kind radio (RHF-managed) toggles savings vs budget fields. */
export function GoalForm({ onSubmitted }: Props) {
  const createGoal = useCreateGoal();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      kind: "savings",
      name: "",
      note: "",
      targetAmount: undefined as unknown as number,
      targetDate: "",
      startedAt: todayIso(),
    } as SavingsFormValues,
  });

  const kind = (watch("kind") ?? "savings") as GoalKind;

  const onSubmit = handleSubmit(async (raw) => {
    // Normalize empty optional fields then validate against the discriminated
    // union so each branch is checked independently.
    const note = raw.note?.trim() ? raw.note.trim() : undefined;
    let candidate: unknown;
    if (raw.kind === "savings") {
      candidate = {
        kind: "savings",
        name: raw.name,
        note,
        targetAmount: Number(raw.targetAmount),
        targetDate: raw.targetDate,
        startedAt: raw.startedAt || todayIso(),
      };
      newSavingsGoalSchema.parse(candidate);
    } else {
      candidate = {
        kind: "budget",
        name: raw.name,
        note,
        monthlyLimit: Number(raw.monthlyLimit),
        category: raw.category,
        startMonth: raw.startMonth || currentMonthKey(),
        endMonth: raw.endMonth ? raw.endMonth : undefined,
      };
      newBudgetGoalSchema.parse(candidate);
    }
    const parsed = newGoalSchema.parse(candidate) as NewGoal;
    await createGoal.mutateAsync(parsed);
    reset();
    onSubmitted?.();
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <fieldset className="flex gap-2 rounded-xl bg-brand-50/60 p-1 text-sm">
        <KindOption value="savings" label="Savings goal" register={register} />
        <KindOption value="budget" label="Budget cap" register={register} />
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="name" className="block text-sm font-semibold text-brand-800">
            Name
          </label>
          <input
            id="name"
            type="text"
            maxLength={80}
            placeholder={kind === "savings" ? "Vacation fund" : "Monthly Food cap"}
            className={fieldClass}
            {...register("name", { required: true })}
          />
          {errors.name && <FieldError message="Name is required" />}
        </div>

        {kind === "savings" ? (
          <>
            <div>
              <label
                htmlFor="targetAmount"
                className="block text-sm font-semibold text-brand-800"
              >
                Target amount
              </label>
              <input
                id="targetAmount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                className={fieldClass}
                {...register("targetAmount", { valueAsNumber: true, required: true })}
              />
            </div>
            <div>
              <label
                htmlFor="targetDate"
                className="block text-sm font-semibold text-brand-800"
              >
                Target date
              </label>
              <input
                id="targetDate"
                type="date"
                className={fieldClass}
                {...register("targetDate", { required: true })}
              />
            </div>
            <div>
              <label
                htmlFor="startedAt"
                className="block text-sm font-semibold text-brand-800"
              >
                Started on
              </label>
              <input
                id="startedAt"
                type="date"
                className={fieldClass}
                defaultValue={todayIso()}
                {...register("startedAt", { required: true })}
              />
            </div>
          </>
        ) : (
          <>
            <div>
              <label
                htmlFor="monthlyLimit"
                className="block text-sm font-semibold text-brand-800"
              >
                Monthly limit
              </label>
              <input
                id="monthlyLimit"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                className={fieldClass}
                {...register("monthlyLimit", { valueAsNumber: true, required: true })}
              />
            </div>
            <div>
              <label
                htmlFor="category"
                className="block text-sm font-semibold text-brand-800"
              >
                Category
              </label>
              <select
                id="category"
                className={fieldClass}
                {...register("category", { required: true })}
              >
                {EXPENSE_CATEGORIES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="startMonth"
                className="block text-sm font-semibold text-brand-800"
              >
                Start month
              </label>
              <input
                id="startMonth"
                type="month"
                className={fieldClass}
                defaultValue={currentMonthKey()}
                {...register("startMonth", { required: true })}
              />
            </div>
            <div>
              <label
                htmlFor="endMonth"
                className="block text-sm font-semibold text-brand-800"
              >
                End month <span className="text-brand-400">(optional)</span>
              </label>
              <input
                id="endMonth"
                type="month"
                className={fieldClass}
                {...register("endMonth")}
              />
            </div>
          </>
        )}

        <div className="sm:col-span-2">
          <label htmlFor="note" className="block text-sm font-semibold text-brand-800">
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
      </div>

      <div className="flex items-center justify-end gap-3">
        <button
          type="submit"
          disabled={isSubmitting || createGoal.isPending}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-brand-400 via-brand-500 to-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_6px_18px_-8px_rgba(223,115,150,0.55)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-10px_rgba(223,115,150,0.65)] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {(isSubmitting || createGoal.isPending) && <Spinner className="text-white" />}
          Create goal
        </button>
      </div>
    </form>
  );
}

function KindOption({
  value,
  label,
  register,
}: {
  value: GoalKind;
  label: string;
  register: UseFormRegister<FormValues>;
}) {
  // Keep schema-aligned: validates the kind enum at compile time.
  goalKindSchema.parse(value);
  return (
    <label className="flex flex-1 cursor-pointer items-center justify-center rounded-lg px-3 py-2 text-sm font-medium text-brand-700 transition has-[:checked]:bg-white has-[:checked]:text-brand-800 has-[:checked]:shadow-sm">
      <input type="radio" value={value} className="sr-only" {...register("kind")} />
      {label}
    </label>
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
