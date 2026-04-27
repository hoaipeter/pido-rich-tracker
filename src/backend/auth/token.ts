import { randomBytes, createHash } from "node:crypto";

/**
 * Generate a fresh invite token: 32 bytes (256 bits) from the OS
 * CSPRNG, URL-safe base64. Raw token only exists in the email URL;
 * storage is the SHA-256 hash. Never log the raw token.
 */
export function generateInviteToken(): string {
  return randomBytes(32).toString("base64url");
}

/** SHA-256 hash for at-rest storage. No salt needed (token is 256 random bits). */
export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
