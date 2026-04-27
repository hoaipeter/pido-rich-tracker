"use client";

import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { familiesApi } from "@frontend/features/families/api-client";
import { Spinner } from "./Spinner";

/** Routes that render their own UI without a session (bypass the splash). */
function isPublicRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return (
    pathname === "/signin" ||
    pathname === "/register" ||
    pathname.startsWith("/signin/") ||
    pathname.startsWith("/register/") ||
    pathname.startsWith("/invite/")
  );
}

/**
 * Splash gate — hides cold-start flicker until session is resolved
 * and the families cache is warm. Public routes bypass entirely.
 */
export function AppBootGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { status } = useSession();
  const isPublic = useMemo(() => isPublicRoute(pathname), [pathname]);
  const isAuthed = status === "authenticated";
  const queryClient = useQueryClient();

  // Same query key as `useFamilies()` so the cache is shared.
  const familiesEnabled = isAuthed && !isPublic;
  const families = useQuery({
    queryKey: ["families", "list"] as const,
    queryFn: () => familiesApi.list(),
    enabled: familiesEnabled,
    staleTime: 5 * 60_000,
  });

  // Defensive prefetch on auth (no second roundtrip in steady state).
  useEffect(() => {
    if (!familiesEnabled) return;
    queryClient.prefetchQuery({
      queryKey: ["families", "list"],
      queryFn: () => familiesApi.list(),
      staleTime: 5 * 60_000,
    });
  }, [familiesEnabled, queryClient]);

  if (isPublic) return <>{children}</>;
  const familiesReady = !familiesEnabled || families.isFetched;
  if (status === "loading" || (familiesEnabled && !familiesReady)) {
    return <BootSplash />;
  }
  return <>{children}</>;
}

function BootSplash() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading"
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-3 bg-cream-50"
    >
      <Spinner />
      <p className="text-sm text-brand-500">Loading your workspace…</p>
    </div>
  );
}
