import type { ReactNode } from "react";
import { cn } from "@frontend/lib/cn";

interface Props {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, className }: Props) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-brand-200 bg-gradient-to-br from-brand-50/60 to-cream-50/60 px-6 py-12 text-center",
        className,
      )}
    >
      <p className="text-sm font-semibold text-brand-800">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-brand-700/70">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
