import { handlers } from "@backend/auth/auth";

// Auth.js uses the Mongo driver + bcrypt — Node runtime required.
export const runtime = "nodejs";

export const { GET, POST } = handlers;
