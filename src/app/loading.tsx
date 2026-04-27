import { BrandLogo } from "@frontend/components/brand/BrandLogo";

export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center gap-5 py-24"
    >
      <div className="relative">
        {/* Pulse rings behind the mascot */}
        <span className="absolute inset-0 -z-10 animate-pulse-ring rounded-2xl bg-brand-200/60" />
        <span
          className="absolute inset-0 -z-10 animate-pulse-ring rounded-2xl bg-brand-300/50"
          style={{ animationDelay: "0.4s" }}
        />
        <div className="animate-bounce-soft drop-shadow-[0_8px_18px_rgba(223,115,150,0.3)]">
          <BrandLogo />
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-sm font-medium text-brand-700">
        <span>Pido is fetching</span>
        <span className="inline-flex">
          <Dot delay="0s" />
          <Dot delay="0.15s" />
          <Dot delay="0.3s" />
        </span>
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="mx-0.5 inline-block h-1.5 w-1.5 animate-bounce-soft rounded-full bg-brand-500"
      style={{ animationDelay: delay }}
      aria-hidden="true"
    />
  );
}
