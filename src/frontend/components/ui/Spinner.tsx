import { cn } from "@frontend/lib/cn";

interface Props {
  className?: string;
  label?: string;
}

export function Spinner({ className, label = "Loading" }: Props) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        "inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent text-brand-400",
        className,
      )}
    />
  );
}
