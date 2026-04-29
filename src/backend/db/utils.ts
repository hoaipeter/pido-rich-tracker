import { ObjectId } from "mongodb";

/**
 * Converts a string to an ObjectId, returning `null` if the value is not
 * a valid 24-hex ObjectId. Centralises the repetitive isValid + new ObjectId
 * guard that every repository would otherwise duplicate.
 */
export function toObjectId(id: string): ObjectId | null {
  if (!ObjectId.isValid(id)) return null;
  return new ObjectId(id);
}

/**
 * Returns `{ createdAt, updatedAt }` both set to the same `new Date()`.
 * Avoids the repeated `const now = new Date(); ... createdAt: now, updatedAt: now`
 * pattern across repository create methods.
 */
export function timestamps(): { createdAt: Date; updatedAt: Date } {
  const now = new Date();
  return { createdAt: now, updatedAt: now };
}
