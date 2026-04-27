"use client";

import { cn } from "@frontend/lib/cn";

interface Props {
  /** 0..1+ — values >1 visually clamp but keep semantic over-budget styling. */
  value: number;
  /** Optional override of the visual fill width (0..1). Useful for budgets. */
  displayValue?: number;
  /** Tailwind text colour class for the label (defaults to brand-700). */
  tone?: "default" | "warning" | "danger" | "success";
  className?: string;
  /** Optional aria label for screen readers. */
  ariaLabel?: string;
}

/** Progress bar shared by savings + budget goals; tone changes fill color. */
export function GoalProgressBar({
  value,
  displayValue,
  tone = "default",
  className,
  ariaLabel,
}: Props) {
  const pct = Math.max(0, Math.min(1, displayValue ?? value));
  const palette = TONE_PALETTES[tone];
  return (
    <div
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct * 100)}
      className={cn(
        "relative h-2.5 w-full overflow-hidden rounded-full bg-brand-50",
        className,
      )}
    >
      <div
        className={cn(
          "absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 ease-out",
          palette,
        )}
        style={{ width: `${pct * 100}%` }}
      />
    </div>
  );
}

const TONE_PALETTES: Record<NonNullable<Props["tone"]>, string> = {
  default: "bg-gradient-to-r from-brand-400 to-brand-600",
  success: "bg-gradient-to-r from-cream-500 to-brand-500",
  warning: "bg-gradient-to-r from-cream-400 to-cream-600",
  danger: "bg-gradient-to-r from-rose-500 to-rose-700",
};
