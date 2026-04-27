"use client";

import { useEffect } from "react";
import { toast } from "sonner";

/**
 * Show a persistent toast on offline → reconnect transitions.
 * react-query handles the actual refetch via `refetchOnReconnect`.
 */
export function useOnlineStatus() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    let lastShownOffline = false;
    let offlineToastId: string | number | undefined;

    const handleOffline = () => {
      if (lastShownOffline) return;
      lastShownOffline = true;
      offlineToastId = toast.error("You're offline.", {
        description: "We'll resume syncing once your connection is back.",
        duration: Infinity, // sticks until reconnect
      });
    };

    const handleOnline = () => {
      if (!lastShownOffline) return;
      lastShownOffline = false;
      if (offlineToastId !== undefined) toast.dismiss(offlineToastId);
      toast.success("Back online.", { duration: 2500 });
    };

    // Initial state — only warn if already offline.
    if (navigator.onLine === false) handleOffline();

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      if (offlineToastId !== undefined) toast.dismiss(offlineToastId);
    };
  }, []);
}
