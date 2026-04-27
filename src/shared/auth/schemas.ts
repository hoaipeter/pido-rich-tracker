import { z } from "zod";

/** Password policy: 12+ chars with lowercase, uppercase, and digit. */
const passwordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .max(128, "Password is too long")
  .refine((value) => /[a-z]/.test(value), "Password must include a lowercase letter")
  .refine((value) => /[A-Z]/.test(value), "Password must include an uppercase letter")
  .refine((value) => /[0-9]/.test(value), "Password must include a digit");

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address")
  .max(254);

export const registerSchema = z.object({
  email: emailSchema,
  name: z.string().trim().min(1, "Name is required").max(80),
  password: passwordSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required").max(128),
});

export type LoginInput = z.infer<typeof loginSchema>;

/** Body for PATCH /api/account — currently only the display name. */
export const updateAccountSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
});

export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;

/** Public user returned by the API. Never includes `passwordHash`. */
export interface PublicUser {
  id: string;
  email: string;
  name: string;
  image: string | null;
}
