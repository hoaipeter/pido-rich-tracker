import NextAuth from "next-auth";
import { authConfig } from "@backend/auth/auth.config";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Middleware runs on the Edge runtime. We initialize a separate Auth.js
// instance from the edge-safe config (no providers that need Node APIs).
const { auth } = NextAuth(authConfig);

function buildCsp(nonce: string): string {
  // In development, Next.js Fast Refresh (HMR) uses eval() inside
  // react-refresh-utils. 'unsafe-eval' is only added in dev; production
  // builds never use eval so the strict policy applies there.
  const isDev = process.env.NODE_ENV === "development";
  const scriptSrc = isDev
    ? `script-src 'self' 'nonce-${nonce}' 'unsafe-eval'`
    : `script-src 'self' 'nonce-${nonce}'`;

  // style-src: 'unsafe-inline' is required for Tailwind at runtime.
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://lh3.googleusercontent.com",
    "font-src 'self' data:",
    "connect-src 'self'",
    "manifest-src 'self'",
    "worker-src 'self' blob:",
    "upgrade-insecure-requests",
  ].join("; ");
}

export default auth((request: NextRequest & { auth: unknown }) => {
  const { nextUrl } = request;
  const session = (request as { auth?: { user?: unknown } }).auth;
  const isAuthed = Boolean(session?.user);

  // Generate a fresh nonce for every HTML page response.
  const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString(
    "base64",
  );
  const csp = buildCsp(nonce);

  const isPublic =
    nextUrl.pathname === "/signin" ||
    nextUrl.pathname === "/register" ||
    nextUrl.pathname.startsWith("/api/auth/");

  if (isPublic) {
    if (
      isAuthed &&
      (nextUrl.pathname === "/signin" || nextUrl.pathname === "/register")
    ) {
      const callbackUrl = nextUrl.searchParams.get("callbackUrl") ?? "/";
      const url = nextUrl.clone();
      url.pathname = callbackUrl.startsWith("/") ? callbackUrl : "/";
      url.search = "";
      const res = NextResponse.redirect(url);
      res.headers.set("Content-Security-Policy", csp);
      return res;
    }
    const res = NextResponse.next();
    res.headers.set("Content-Security-Policy", csp);
    // Forward nonce to layout.tsx via request header.
    res.headers.set("x-nonce", nonce);
    return res;
  }

  if (!isAuthed) {
    const url = nextUrl.clone();
    url.pathname = "/signin";
    url.search = `?callbackUrl=${encodeURIComponent(nextUrl.pathname + nextUrl.search)}`;
    if (nextUrl.pathname.startsWith("/api/")) {
      return Response.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 },
      );
    }
    const res = NextResponse.redirect(url);
    res.headers.set("Content-Security-Policy", csp);
    return res;
  }

  const res = NextResponse.next({
    request: {
      // Pass nonce to server components via a forwarded request header.
      headers: new Headers({ ...Object.fromEntries(request.headers), "x-nonce": nonce }),
    },
  });
  res.headers.set("Content-Security-Policy", csp);
  return res;
});

export const config = {
  // Run on every path EXCEPT static assets, image optimization, and
  // Next.js internals. Includes /api/* so unauthenticated API calls get
  // a clean 401.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)",
  ],
};
