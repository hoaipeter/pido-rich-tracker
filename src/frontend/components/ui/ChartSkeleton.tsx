import { cn } from "@frontend/lib/cn";

interface Props {
  /** Tailwind height utility, e.g. `h-64`. */
  height?: string;
  className?: string;
}

/** Shimmer placeholder for loading charts \u2014 prevents layout shift on swap-in. */
export function ChartSkeleton({ height = "h-64", className }: Props) {
  return (
    <div
      role="status"
      aria-label="Loading chart"
      className={cn(
        "animate-pulse rounded-xl bg-gradient-to-r from-brand-50 via-brand-100 to-brand-50",
        height,
        className,
      )}
    />
  );
}
