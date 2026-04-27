import type { NextAuthConfig } from "next-auth";
import { env } from "@backend/config/env";
import { isEmailAllowed, parseAllowlist } from "@backend/auth/allowlist";

/**
 * Edge-safe Auth.js config. Imported by middleware (Edge) AND the full
 * Node config in `auth.ts`. MUST NOT pull in Node-only modules
 * (no `mongodb`, `bcryptjs`, `MongoDBAdapter`).
 */

const allowlist = parseAllowlist(env.AUTH_ALLOWED_EMAILS);

// `__Secure-` prefix only over HTTPS — browsers reject it on http://localhost.
const isHttps =
  env.NODE_ENV === "production" ||
  (typeof env.AUTH_URL === "string" && env.AUTH_URL.startsWith("https://"));
const sessionCookieName = isHttps
  ? "__Secure-authjs.session-token"
  : "authjs.session-token";

// 7-day absolute lifetime, refreshed at most once/day. Shorter than
// Auth.js's 30-day default to limit cookie-theft blast radius.
const SEVEN_DAYS = 7 * 24 * 60 * 60;
const ONE_DAY = 24 * 60 * 60;

export const authConfig: NextAuthConfig = {
  trustHost: env.AUTH_TRUST_HOST,
  secret: env.AUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: SEVEN_DAYS,
    updateAge: ONE_DAY,
  },
  jwt: {
    maxAge: SEVEN_DAYS,
  },
  pages: {
    signIn: "/signin",
    error: "/signin",
  },
  // Explicit cookie config: httpOnly + SameSite=Lax + Secure-in-prod, with
  // the `__Secure-` prefix as a browser-enforced tampering guard.
  cookies: {
    sessionToken: {
      name: sessionCookieName,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isHttps,
      },
    },
  },
  callbacks: {
    /**
     * Single chokepoint for sign-in policy. Runs after Credentials
     * `authorize` succeeds and on every Google sign-in.
     */
    async signIn({ user, account }) {
      if (!user.email) return false;
      // Allowlist gate for OAuth (credentials register already enforces it).
      if (account?.provider === "google" && !isEmailAllowed(user.email, allowlist)) {
        return false;
      }
      return true;
    },

    /** Middleware admission gate. Public paths bypass auth. */
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isAuthed = Boolean(auth?.user);

      // Public: auth pages, Auth.js endpoints, and the unauthenticated
      // invite preview (accept itself is server-guarded).
      const isPublic =
        pathname === "/signin" ||
        pathname === "/register" ||
        pathname.startsWith("/api/auth/") ||
        pathname.startsWith("/invite/") ||
        /^\/api\/invites\/[^/]+\/preview$/.test(pathname);

      if (isPublic) return true;
      return isAuthed;
    },
  },
  providers: [],
};
