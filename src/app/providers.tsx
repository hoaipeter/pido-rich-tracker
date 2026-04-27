"use client";

import { QueryClient, QueryClientProvider, isServer } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { SessionProvider } from "next-auth/react";
import { type ReactNode } from "react";
import { Toaster } from "sonner";
import { ConfirmDialogProvider } from "@frontend/components/ui/ConfirmDialog";
import { AppBootGate } from "@frontend/components/ui/AppBootGate";
import { useOnlineStatus } from "@frontend/lib/useOnlineStatus";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Tuned for "feels-instant on revisit" without flooding the API:
        // - staleTime 5min: most domain data (expenses, goals, families)
        //   doesn't change minute-to-minute. Hooks that need fresher data
        //   override this locally.
        // - gcTime 30min: keep results in memory long enough that
        //   navigating away and back is instant from cache.
        // - refetchOnWindowFocus off: nuisance refetches were the #1
        //   source of perceived slowness on tab-switch.
        // - refetchOnReconnect: refetch when the network comes back so
        //   offline users see fresh data on resume.
        staleTime: 5 * 60_000,
        gcTime: 30 * 60_000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        retry: 1,
        // Networks: don't hammer on retry; back off.
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (isServer) {
    // Each server request gets its own client to avoid cache leakage between
    // users in a serverless deployment.
    return makeQueryClient();
  }
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}

export function Providers({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <SessionProvider refetchOnWindowFocus={false}>
      <QueryClientProvider client={queryClient}>
        <ConfirmDialogProvider>
          <OnlineStatusBridge />
          <AppBootGate>{children}</AppBootGate>
        </ConfirmDialogProvider>
        <Toaster
          position="top-right"
          closeButton
          offset={16}
          toastOptions={{
            unstyled: false,
            duration: 3500,
            classNames: {
              toast:
                "!rounded-2xl !border !border-brand-200 !bg-white/95 !backdrop-blur !shadow-[0_10px_30px_-10px_rgba(223,115,150,0.3)] !text-brand-900 !font-medium",
              title: "!text-brand-900 !font-semibold",
              description: "!text-brand-700/80",
              actionButton: "!bg-brand-500 !text-white hover:!bg-brand-600 !rounded-lg",
              cancelButton:
                "!bg-brand-50 !text-brand-700 hover:!bg-brand-100 !rounded-lg",
              closeButton:
                "!bg-white !border-brand-200 !text-brand-500 hover:!bg-brand-50",
              success: "!border-brand-300 !bg-gradient-to-br !from-brand-50 !to-cream-50",
              error:
                "!border-rose-300 !bg-gradient-to-br !from-rose-50 !to-cream-50 !text-rose-900",
              info: "!border-brand-200 !bg-brand-50/80",
              warning:
                "!border-cream-300 !bg-gradient-to-br !from-cream-50 !to-brand-50 !text-cream-900",
            },
          }}
        />
        {process.env.NODE_ENV === "development" && (
          <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
        )}
      </QueryClientProvider>
    </SessionProvider>
  );
}

/**
 * Tiny invisible component whose only job is to subscribe to the
 * browser online/offline events and surface them as toasts. Lives
 * inside QueryClientProvider so we could later trigger a refetch on
 * reconnect from here too (already handled by `refetchOnReconnect`).
 */
function OnlineStatusBridge() {
  useOnlineStatus();
  return null;
}
