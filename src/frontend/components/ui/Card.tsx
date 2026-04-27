import { type HTMLAttributes } from "react";
import { cn } from "@frontend/lib/cn";

type CardProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className, ...props }: CardProps) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-brand-100 bg-white/90 shadow-[0_4px_20px_-10px_rgba(223,115,150,0.18)] backdrop-blur-sm transition-shadow hover:shadow-[0_8px_28px_-12px_rgba(223,115,150,0.28)]",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: CardProps) {
  return (
    <header
      className={cn("border-b border-brand-100/80 px-5 py-4 sm:px-6", className)}
      {...props}
    />
  );
}

export function CardBody({ className, ...props }: CardProps) {
  return <div className={cn("p-5 sm:p-6", className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn("text-base font-semibold tracking-tight text-brand-900", className)}
      {...props}
    />
  );
}

export function CardSubtitle({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("mt-1 text-sm text-brand-700/70", className)} {...props} />;
}
