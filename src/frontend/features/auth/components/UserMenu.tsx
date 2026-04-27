"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@frontend/lib/cn";

export function UserMenu() {
  const { data: session, status } = useSession();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  if (status === "loading") {
    return (
      <div className="h-8 w-8 animate-pulse rounded-full bg-brand-100" aria-hidden />
    );
  }

  if (!session?.user) return null;

  const display = session.user.name ?? session.user.email ?? "Account";
  const initial = (display ?? "?").trim().charAt(0).toUpperCase();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        onBlur={() => {
          // Close on next tick so click handlers inside the panel can fire.
          setTimeout(() => setOpen(false), 120);
        }}
        className={cn(
          "flex items-center gap-2 rounded-full border border-brand-200 bg-white px-2 py-1 text-sm text-brand-800 shadow-sm transition hover:bg-brand-50",
        )}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span
          className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-500 text-xs font-semibold text-white"
          aria-hidden
        >
          {initial}
        </span>
        <span className="hidden max-w-[10rem] truncate sm:inline">{display}</span>
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-48 rounded-lg border border-brand-100 bg-white p-1 shadow-lg"
        >
          <div className="px-3 py-2 text-xs text-brand-500">
            Signed in as
            <div className="truncate text-sm font-medium text-brand-800">
              {session.user.email}
            </div>
          </div>
          <div className="my-1 h-px bg-brand-100" />
          <Link
            href="/account"
            onClick={() => setOpen(false)}
            className="block w-full rounded-md px-3 py-2 text-left text-sm text-brand-800 transition hover:bg-brand-50"
            role="menuitem"
          >
            Account
          </Link>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              // Drop every cached query before redirecting so the next
              // user (or anonymous landing) cannot momentarily render
              // the signed-out user's data from React Query's store.
              queryClient.clear();
              void signOut({ callbackUrl: "/signin" });
            }}
            className="block w-full rounded-md px-3 py-2 text-left text-sm text-brand-800 transition hover:bg-brand-50"
            role="menuitem"
          >
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
