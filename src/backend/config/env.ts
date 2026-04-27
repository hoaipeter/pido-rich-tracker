import { z } from "zod";

const optionalString = z
  .string()
  .trim()
  .min(1)
  .optional()
  .or(z.literal("").transform(() => undefined));

const envSchema = z
  .object({
    MONGODB_URI: z.string().min(1, "MONGODB_URI is required. See .env.example."),
    MONGODB_DB: z.string().min(1).default("pido_tracker"),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

    // Auth.js (NextAuth v5)
    AUTH_SECRET: z
      .string()
      .min(32, "AUTH_SECRET must be at least 32 chars (use `openssl rand -base64 32`)."),
    AUTH_URL: optionalString, // Required in prod for OAuth callbacks; Vercel auto-injects.
    AUTH_TRUST_HOST: z
      .union([z.literal("true"), z.literal("false")])
      .default("true")
      .transform((v) => v === "true"),

    // Closed sign-up: comma-separated list of allowed emails.
    AUTH_ALLOWED_EMAILS: z
      .string()
      .min(1, "AUTH_ALLOWED_EMAILS is required (comma-separated list)."),

    // Google OAuth (optional — provider only registered when both are present)
    AUTH_GOOGLE_ID: optionalString,
    AUTH_GOOGLE_SECRET: optionalString,

    // SMTP email delivery (free path: Gmail App Password). Set HOST + USER
    // + PASS together. When unset, invite emails are no-op'd and the
    // raw invite URL is surfaced in the API response instead.
    SMTP_HOST: optionalString,
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    SMTP_USER: optionalString,
    SMTP_PASS: optionalString,
    SMTP_SECURE: z
      .union([z.literal("true"), z.literal("false")])
      .default("false")
      .transform((v) => v === "true"),

    // Optional From-header override. Most SMTP providers (notably Gmail)
    // rewrite this to the authenticated user, so it's only useful when
    // your provider permits a custom sender.
    EMAIL_FROM: optionalString,

    // Public origin used to construct invite URLs. Falls back to AUTH_URL.
    APP_URL: optionalString,

    // Rate-limit backend. The default in-memory store does NOT survive
    // serverless cold starts, so production must use a shared store.
    RATE_LIMIT_BACKEND: z.enum(["memory", "upstash"]).default("memory"),
    UPSTASH_REDIS_REST_URL: optionalString,
    UPSTASH_REDIS_REST_TOKEN: optionalString,

    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  })
  .superRefine((data, ctx) => {
    const hasId = Boolean(data.AUTH_GOOGLE_ID);
    const hasSecret = Boolean(data.AUTH_GOOGLE_SECRET);
    if (hasId !== hasSecret) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["AUTH_GOOGLE_ID"],
        message:
          "Set both AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET to enable Google sign-in, or leave both unset.",
      });
    }
    // SMTP is configured as a triple — partial config is almost always a
    // misconfiguration and would silently fall through to noop.
    const smtpFields = [data.SMTP_HOST, data.SMTP_USER, data.SMTP_PASS];
    const smtpSet = smtpFields.filter(Boolean).length;
    if (smtpSet > 0 && smtpSet < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["SMTP_HOST"],
        message:
          "Set SMTP_HOST, SMTP_USER, and SMTP_PASS together, or leave all three unset.",
      });
    }

    // Production-only guards. These run after base parsing so they only fire
    // when NODE_ENV=production; dev/test are unaffected. The `next build`
    // phase also sets NODE_ENV=production but does not actually serve
    // traffic, so we skip the runtime-only checks during it.
    const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
    if (data.NODE_ENV === "production" && !isBuildPhase) {
      // AUTH_TRUST_HOST=true outside Vercel can let an attacker spoof the
      // host header used to mint redirect URIs. Vercel's platform sets the
      // VERCEL env var on every build/runtime, so we use it as the marker
      // for "trusted reverse proxy".
      if (data.AUTH_TRUST_HOST && !process.env.VERCEL) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["AUTH_TRUST_HOST"],
          message:
            "AUTH_TRUST_HOST=true requires the Vercel platform or an equivalent trusted proxy. Set it to false for self-hosted deployments without a verified host header.",
        });
      }

      if (!data.AUTH_URL && !process.env.VERCEL) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["AUTH_URL"],
          message:
            "AUTH_URL is required in production (Vercel auto-injects it from VERCEL_URL).",
        });
      }

      if (/placeholder|change[-_ ]?me|example|replace/i.test(data.AUTH_SECRET)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["AUTH_SECRET"],
          message:
            "AUTH_SECRET looks like a placeholder. Generate a real secret with `openssl rand -base64 32`.",
        });
      }

      if (data.RATE_LIMIT_BACKEND !== "upstash") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["RATE_LIMIT_BACKEND"],
          message:
            "Production must set RATE_LIMIT_BACKEND=upstash. The in-memory store does not survive serverless cold starts.",
        });
      }
      if (data.RATE_LIMIT_BACKEND === "upstash") {
        if (!data.UPSTASH_REDIS_REST_URL || !data.UPSTASH_REDIS_REST_TOKEN) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["UPSTASH_REDIS_REST_URL"],
            message:
              "RATE_LIMIT_BACKEND=upstash requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.",
          });
        }
      }
    }
  });

const parsed = envSchema.safeParse({
  MONGODB_URI: process.env.MONGODB_URI,
  MONGODB_DB: process.env.MONGODB_DB,
  NODE_ENV: process.env.NODE_ENV,
  AUTH_SECRET: process.env.AUTH_SECRET,
  AUTH_URL: process.env.AUTH_URL ?? process.env.NEXTAUTH_URL,
  AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST,
  AUTH_ALLOWED_EMAILS: process.env.AUTH_ALLOWED_EMAILS,
  AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
  AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,
  EMAIL_FROM: process.env.EMAIL_FROM,
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  SMTP_SECURE: process.env.SMTP_SECURE,
  APP_URL: process.env.APP_URL ?? process.env.AUTH_URL ?? process.env.NEXTAUTH_URL,
  RATE_LIMIT_BACKEND: process.env.RATE_LIMIT_BACKEND,
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  LOG_LEVEL: process.env.LOG_LEVEL,
});

if (!parsed.success) {
  // Fail loud at boot — a missing connection string is a configuration bug,
  // not a runtime condition we should silently degrade for.
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  throw new Error(`Invalid environment configuration:\n${issues}`);
}

export const env = parsed.data;
