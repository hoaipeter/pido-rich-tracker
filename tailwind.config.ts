import type { Config } from "tailwindcss";

/**
 * Pido (Pig + Dog) — pink pastel theme.
 *
 * The codebase historically used Tailwind's `emerald` palette as the primary
 * accent. We remap `emerald` -> a soft pink pastel so every existing
 * `emerald-*` class instantly adopts the new brand palette without churn.
 *
 * `brand` is a semantic alias for new code; `cream` is the warm secondary tone.
 */
const pinkPastel = {
  50: "#fff7fa",
  100: "#fdebf2",
  200: "#fad4e1",
  300: "#f5b3ca",
  400: "#ec8eae",
  500: "#df7396",
  600: "#c25c7d",
  700: "#9c4865",
  800: "#763850",
  900: "#5a2c3e",
  950: "#3a1c28",
} as const;

const cream = {
  50: "#fffaf5",
  100: "#fdf2e7",
  200: "#f8e2cb",
  300: "#efc9a5",
  400: "#dfac7e",
  500: "#c89066",
  600: "#a8744e",
  700: "#825a3d",
  800: "#5e4129",
  900: "#3f2c1c",
} as const;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Remap emerald -> pink pastel so existing classes recolor automatically.
        emerald: pinkPastel,
        brand: pinkPastel,
        cream,
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        wiggle: {
          "0%, 100%": { transform: "rotate(-4deg)" },
          "50%": { transform: "rotate(4deg)" },
        },
        "bounce-soft": {
          "0%, 100%": {
            transform: "translateY(0) scale(1)",
            animationTimingFunction: "cubic-bezier(0.4, 0, 0.6, 1)",
          },
          "50%": {
            transform: "translateY(-12px) scale(1.05)",
            animationTimingFunction: "cubic-bezier(0.4, 0, 0.6, 1)",
          },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.85)", opacity: "0.6" },
          "100%": { transform: "scale(1.6)", opacity: "0" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
      },
      animation: {
        "fade-in": "fade-in 200ms ease-out",
        wiggle: "wiggle 700ms ease-in-out",
        "bounce-soft": "bounce-soft 1.1s infinite",
        float: "float 3s ease-in-out infinite",
        "pulse-ring": "pulse-ring 1.6s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        shimmer: "shimmer 1.6s linear infinite",
      },
      backgroundImage: {
        "brand-gradient":
          "linear-gradient(135deg, #fde6ee 0%, #fdebf2 45%, #fdf2e7 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
