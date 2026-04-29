"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useFamilies, useSetActiveFamily } from "../hooks";
import { cn } from "@frontend/lib/cn";

/**
 * Compact workspace picker. Switching triggers `session.update()`
 * inside the mutation hook, which cascades the new `fid`/`role` plus
 * a query-cache wipe (data is family-scoped).
 */
export function WorkspaceSwitcher() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { data, isLoading } = useFamilies();
  const setActive = useSetActiveFamily();

  // Outside-click + Escape dismissal. Avoid `onBlur` + setTimeout — that
  // pattern races with child Link clicks and swallows navigation.
  useEffect(() => {
    if (!open) return;
    const handlePointer = (event: MouseEvent | TouchEvent) => {
      const node = containerRef.current;
      if (node && !node.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("touchstart", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("touchstart", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  if (isLoading || !data) {
    return <div className="bg-brand-100 h-8 w-32 animate-pulse rounded-md" aria-hidden />;
  }

  const active = data.families.find((f) => f.id === data.activeFamilyId);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "border-brand-200 text-brand-800 hover:bg-brand-50 flex max-w-[14rem] items-center gap-2 rounded-md border bg-white px-3 py-1.5 text-sm shadow-sm transition",
        )}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Switch workspace"
      >
        <span
          className="bg-brand-500 flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-semibold text-white"
          aria-hidden
        >
          {(active?.name ?? "?").trim().charAt(0).toUpperCase()}
        </span>
        <span className="truncate">{active?.name ?? "No workspace"}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="text-brand-500 h-3.5 w-3.5"
          aria-hidden
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open ? (
        <div
          role="menu"
          className="border-brand-100 absolute right-0 z-40 mt-2 w-64 rounded-lg border bg-white p-1 shadow-lg"
        >
          <div className="text-brand-500 px-3 py-2 text-xs tracking-wide uppercase">
            Workspaces
          </div>
          <ul className="max-h-64 overflow-auto">
            {data.families.map((family) => {
              const isActive = family.id === data.activeFamilyId;
              return (
                <li key={family.id}>
                  <button
                    type="button"
                    disabled={setActive.isPending}
                    onClick={() => {
                      setOpen(false);
                      if (isActive) return;
                      setActive.mutate(family.id);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition",
                      isActive
                        ? "bg-emerald-50 text-emerald-700"
                        : "text-brand-800 hover:bg-brand-50",
                      setActive.isPending && !isActive && "cursor-wait opacity-50",
                    )}
                    role="menuitemradio"
                    aria-checked={isActive}
                  >
                    <span className="truncate">{family.name}</span>
                    <span className="text-brand-500 ml-2 text-xs uppercase">
                      {family.role}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="bg-brand-100 my-1 h-px" />
          <Link
            href="/families"
            onClick={() => setOpen(false)}
            className="text-brand-800 hover:bg-brand-50 block rounded-md px-3 py-2 text-sm transition"
            role="menuitem"
          >
            Manage workspaces…
          </Link>
        </div>
      ) : null}
    </div>
  );
}
