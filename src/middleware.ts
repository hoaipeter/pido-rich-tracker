import NextAuth from "next-auth";
import { authConfig } from "@backend/auth/auth.config";

// Middleware runs on the Edge runtime. We initialize a separate Auth.js
// instance from the edge-safe config (no providers that need Node APIs).
const { auth } = NextAuth(authConfig);

export default auth((request) => {
  const { nextUrl, auth: session } = request;
  const isAuthed = Boolean(session?.user);

  const isPublic =
    nextUrl.pathname === "/signin" ||
    nextUrl.pathname === "/register" ||
    nextUrl.pathname.startsWith("/api/auth/");

  if (isPublic) {
    // If already authenticated, bounce off the auth pages back to the
    // app to avoid showing the form to a logged-in user.
    if (
      isAuthed &&
      (nextUrl.pathname === "/signin" || nextUrl.pathname === "/register")
    ) {
      const callbackUrl = nextUrl.searchParams.get("callbackUrl") ?? "/";
      const url = nextUrl.clone();
      url.pathname = callbackUrl.startsWith("/") ? callbackUrl : "/";
      url.search = "";
      return Response.redirect(url);
    }
    return undefined;
  }

  if (!isAuthed) {
    const url = nextUrl.clone();
    url.pathname = "/signin";
    url.search = `?callbackUrl=${encodeURIComponent(nextUrl.pathname + nextUrl.search)}`;
    // For API requests, return 401 JSON instead of HTML redirect.
    if (nextUrl.pathname.startsWith("/api/")) {
      return Response.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 },
      );
    }
    return Response.redirect(url);
  }

  return undefined;
});

export const config = {
  // Run on every path EXCEPT static assets, image optimization, and
  // Next.js internals. Includes /api/* so unauthenticated API calls get
  // a clean 401.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)",
  ],
};
