import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import { MongoClient, ServerApiVersion } from "mongodb";
import { env } from "@backend/config/env";
import { authConfig } from "./auth.config";
import { userService, AuthError } from "@backend/modules/users/user.service";
import { loginSchema } from "@shared/auth/schemas";
import { familyService } from "@backend/modules/families/family.service";

/**
 * Full Auth.js config (Node runtime). Pulls in `mongodb` + `bcryptjs`
 * — MUST NOT be imported from middleware or any Edge route.
 */

// Adapter gets its own MongoClient so it doesn't fight the app pool over
// Server API strict mode (adapter performs schema ops strict mode rejects).
const adapterOptions = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: false,
    deprecationErrors: true,
  },
  maxPoolSize: 5,
};

declare global {
  var _authMongoClientPromise: Promise<MongoClient> | undefined;
}

function getAdapterClient(): Promise<MongoClient> {
  if (env.NODE_ENV === "development") {
    globalThis._authMongoClientPromise ??= new MongoClient(
      env.MONGODB_URI,
      adapterOptions,
    ).connect();
    return globalThis._authMongoClientPromise;
  }
  if (!_prodAdapterClientPromise) {
    _prodAdapterClientPromise = new MongoClient(
      env.MONGODB_URI,
      adapterOptions,
    ).connect();
  }
  return _prodAdapterClientPromise;
}

let _prodAdapterClientPromise: Promise<MongoClient> | undefined;

const providers: Provider[] = [
  Credentials({
    name: "Credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(rawCredentials) {
      const parsed = loginSchema.safeParse(rawCredentials);
      if (!parsed.success) return null;
      try {
        const user = await userService.verifyPassword(
          parsed.data.email,
          parsed.data.password,
        );
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image ?? undefined,
        };
      } catch (error) {
        if (error instanceof AuthError) return null;
        throw error;
      }
    },
  }),
];

if (env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: env.AUTH_GOOGLE_ID,
      clientSecret: env.AUTH_GOOGLE_SECRET,
      // Keep Auth.js default: do NOT auto-link OAuth to a Credentials
      // account with the same email (account-takeover risk).
    }),
  );
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: MongoDBAdapter(getAdapterClient(), { databaseName: env.MONGODB_DB }),
  providers,
  callbacks: {
    ...authConfig.callbacks,

    /**
     * Hydrates active family + role + `mv` (membership version) into
     * the token at sign-in and on `update()` triggers. `mv` powers the
     * "revoked-on-next-request" guard in `getCurrentFamilyContext`.
     */
    async jwt({ token, user, trigger }) {
      // Copy internal user id into `sub` on initial sign-in.
      if (user?.id) {
        token.sub = user.id;
      }

      const refreshNeeded =
        Boolean(user) || trigger === "update" || token.fid === undefined;
      if (!refreshNeeded) return token;

      const userId = (user?.id as string | undefined) ?? token.sub;
      if (!userId) return token;
      const userEmail =
        (user?.email as string | undefined) ?? (token.email as string | undefined);
      if (!userEmail) return token;

      const ensured = await familyService.ensureActiveFamily({
        id: userId,
        name:
          (user?.name as string | undefined) ??
          (token.name as string | undefined) ??
          null,
        email: userEmail,
      });
      token.fid = ensured.family.id;
      token.role = ensured.role;
      token.mv = ensured.family.membershipVersion;
      return token;
    },

    async session({ session, token }) {
      if (token.sub && session.user) {
        (session.user as { id?: string }).id = token.sub;
      }
      if (session.user) {
        session.user.activeFamilyId = token.fid ?? "";
        session.user.role = token.role ?? "member";
      }
      return session;
    },
  },
});

/** Whether Google sign-in is configured. Read by the sign-in page. */
export const googleEnabled = Boolean(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET);
