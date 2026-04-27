import { cn } from "@frontend/lib/cn";

interface Props {
  className?: string;
  /** "icon" badge | "wordmark" badge+text | "mark" bare SVG */
  variant?: "icon" | "wordmark" | "mark";
  /** Size in pixels for the bare `mark` variant (default 64). */
  size?: number;
}

/** Pido brand mark. "Pido" = Pig + Dog — pastel pig + cream dog mascot. */
export function BrandLogo({ className, variant = "icon", size = 72 }: Props) {
  if (variant === "mark") {
    return (
      <PidoMascot
        className={className}
        style={{ width: size, height: (size * 60) / 96 }}
      />
    );
  }

  const icon = (
    <span
      className={cn(
        "relative grid h-10 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-50 via-cream-50 to-brand-100 px-1 ring-1 ring-brand-100/80",
        className,
      )}
      aria-hidden="true"
    >
      <PidoMascot className="h-7 w-10" />
    </span>
  );

  if (variant === "icon") return icon;

  return (
    <span className="flex items-center gap-2.5">
      {icon}
      <span className="flex flex-col leading-tight">
        <span className="text-lg font-bold tracking-tight text-brand-700">Pido</span>
        <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-brand-500/70">
          Rich tracker
        </span>
      </span>
    </span>
  );
}

interface MascotProps {
  className?: string;
  style?: React.CSSProperties;
}

/** Pig + dog mascot SVG (wide 96×60 viewBox). */
function PidoMascot({ className, style }: MascotProps) {
  return (
    <svg
      viewBox="0 0 96 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      role="img"
      aria-label="Pido mascot — a pig and a dog standing side by side"
    >
      <defs>
        {/* Pig fills */}
        <radialGradient id="pig-face" cx="50%" cy="40%" r="65%">
          <stop offset="0%" stopColor="#fff7fa" />
          <stop offset="60%" stopColor="#fdebf2" />
          <stop offset="100%" stopColor="#f5b3ca" />
        </radialGradient>
        <linearGradient id="pig-snout" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f5b3ca" />
          <stop offset="100%" stopColor="#df7396" />
        </linearGradient>
        {/* Dog fills */}
        <radialGradient id="dog-face" cx="50%" cy="40%" r="65%">
          <stop offset="0%" stopColor="#fffaf5" />
          <stop offset="60%" stopColor="#fdf2e7" />
          <stop offset="100%" stopColor="#efc9a5" />
        </radialGradient>
        <linearGradient id="dog-ear" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#dfac7e" />
          <stop offset="100%" stopColor="#a8744e" />
        </linearGradient>
        <linearGradient id="dog-muzzle" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fdf2e7" />
          <stop offset="100%" stopColor="#f8e2cb" />
        </linearGradient>
      </defs>

      {/* ===== PIG (left) ===== */}
      {/* Body shadow on ground */}
      <ellipse cx="26" cy="55" rx="16" ry="2" fill="#763850" opacity="0.08" />

      {/* Pig ears (back layer, soft triangles flopping forward) */}
      <path
        d="M14 16 Q12 9 17 9 Q21 12 21 18 Z"
        fill="#f5b3ca"
        stroke="#c25c7d"
        strokeOpacity="0.4"
        strokeWidth="0.6"
        strokeLinejoin="round"
      />
      <path
        d="M38 16 Q40 9 35 9 Q31 12 31 18 Z"
        fill="#f5b3ca"
        stroke="#c25c7d"
        strokeOpacity="0.4"
        strokeWidth="0.6"
        strokeLinejoin="round"
      />

      {/* Pig head + body (rounded blob) */}
      <path
        d="M26 14 C36 14 42 21 42 31 C42 42 36 50 26 50 C16 50 10 42 10 31 C10 21 16 14 26 14 Z"
        fill="url(#pig-face)"
        stroke="#ec8eae"
        strokeOpacity="0.55"
        strokeWidth="0.8"
      />

      {/* Pig curly tail */}
      <path
        d="M40 36 q4 -1 4 -4 q0 -3 -3 -3 q-2 0 -2 2"
        stroke="#c25c7d"
        strokeOpacity="0.7"
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />

      {/* Pig cheek blush */}
      <ellipse cx="14" cy="34" rx="2.4" ry="1.6" fill="#ec8eae" opacity="0.4" />
      <ellipse cx="38" cy="34" rx="2.4" ry="1.6" fill="#ec8eae" opacity="0.4" />

      {/* Pig eyes (closed happy arcs) */}
      <path
        d="M18 28 Q20.5 25.5 23 28"
        stroke="#5a2c3e"
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M29 28 Q31.5 25.5 34 28"
        stroke="#5a2c3e"
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />

      {/* Pig snout */}
      <ellipse
        cx="26"
        cy="37"
        rx="7"
        ry="5"
        fill="url(#pig-snout)"
        stroke="#9c4865"
        strokeOpacity="0.5"
        strokeWidth="0.8"
      />
      <ellipse cx="24" cy="35" rx="2" ry="0.9" fill="#fff" opacity="0.45" />
      <ellipse cx="23.5" cy="37.5" rx="0.9" ry="1.3" fill="#5a2c3e" />
      <ellipse cx="28.5" cy="37.5" rx="0.9" ry="1.3" fill="#5a2c3e" />

      {/* Pig little hooves */}
      <ellipse cx="20" cy="49" rx="2.2" ry="1.4" fill="#9c4865" opacity="0.7" />
      <ellipse cx="32" cy="49" rx="2.2" ry="1.4" fill="#9c4865" opacity="0.7" />

      {/* ===== HEART between them ===== */}
      <path
        d="M48 24 q-2 -3 -4 -1 q-2 2 0 4 l4 4 l4 -4 q2 -2 0 -4 q-2 -2 -4 1 Z"
        fill="#ec8eae"
        opacity="0.85"
      />
      <path
        d="M46.2 23.6 q0.6 -0.6 1.2 -0.2"
        stroke="#fff"
        strokeOpacity="0.7"
        strokeWidth="0.6"
        strokeLinecap="round"
        fill="none"
      />

      {/* ===== DOG (right) ===== */}
      <ellipse cx="70" cy="55" rx="16" ry="2" fill="#5e4129" opacity="0.08" />

      {/* Dog floppy ears (back layer) */}
      <path
        d="M58 18 Q53 22 54 32 Q55 39 60 39 Q63 38 63 31 Q63 22 60 18 Z"
        fill="url(#dog-ear)"
        stroke="#825a3d"
        strokeOpacity="0.4"
        strokeWidth="0.6"
        strokeLinejoin="round"
      />
      <path
        d="M82 18 Q87 22 86 32 Q85 39 80 39 Q77 38 77 31 Q77 22 80 18 Z"
        fill="url(#dog-ear)"
        stroke="#825a3d"
        strokeOpacity="0.4"
        strokeWidth="0.6"
        strokeLinejoin="round"
      />

      {/* Dog head + body */}
      <path
        d="M70 14 C80 14 86 21 86 31 C86 42 80 50 70 50 C60 50 54 42 54 31 C54 21 60 14 70 14 Z"
        fill="url(#dog-face)"
        stroke="#dfac7e"
        strokeOpacity="0.55"
        strokeWidth="0.8"
      />

      {/* Dog tail (wagging stub) */}
      <path d="M86 33 q3 -2 5 -1 q1 1 0 2 q-2 1 -5 2" fill="#dfac7e" opacity="0.85" />

      {/* Dog brown spot over one eye */}
      <ellipse cx="65" cy="26" rx="5" ry="4" fill="#a8744e" opacity="0.45" />

      {/* Dog cheek blush */}
      <ellipse cx="58" cy="36" rx="2.2" ry="1.4" fill="#ec8eae" opacity="0.35" />
      <ellipse cx="82" cy="36" rx="2.2" ry="1.4" fill="#ec8eae" opacity="0.35" />

      {/* Dog eyes (closed happy arcs) */}
      <path
        d="M62 28 Q64.5 25.5 67 28"
        stroke="#3f2c1c"
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M73 28 Q75.5 25.5 78 28"
        stroke="#3f2c1c"
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />

      {/* Dog muzzle */}
      <ellipse
        cx="70"
        cy="38"
        rx="6.5"
        ry="4.5"
        fill="url(#dog-muzzle)"
        stroke="#a8744e"
        strokeOpacity="0.4"
        strokeWidth="0.7"
      />
      {/* Dog nose */}
      <ellipse cx="70" cy="36.2" rx="1.6" ry="1.2" fill="#3f2c1c" />
      <ellipse cx="69.5" cy="35.8" rx="0.5" ry="0.35" fill="#fff" opacity="0.7" />
      {/* Dog mouth */}
      <path
        d="M70 38 L70 40 Q67.5 42 66 40.5"
        stroke="#3f2c1c"
        strokeOpacity="0.7"
        strokeWidth="1"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M70 40 Q72.5 42 74 40.5"
        stroke="#3f2c1c"
        strokeOpacity="0.7"
        strokeWidth="1"
        strokeLinecap="round"
        fill="none"
      />
      {/* Dog tongue */}
      <path d="M69 41.5 Q70 43 71 41.5 Z" fill="#ec8eae" opacity="0.85" />

      {/* Dog paws */}
      <ellipse cx="64" cy="49" rx="2.2" ry="1.4" fill="#825a3d" opacity="0.6" />
      <ellipse cx="76" cy="49" rx="2.2" ry="1.4" fill="#825a3d" opacity="0.6" />
    </svg>
  );
}
