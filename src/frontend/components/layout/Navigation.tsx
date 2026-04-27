"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandLogo } from "@frontend/components/brand/BrandLogo";
import { UserMenu } from "@frontend/features/auth/components/UserMenu";
import { WorkspaceSwitcher } from "@frontend/features/families/components/WorkspaceSwitcher";
import { cn } from "@frontend/lib/cn";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/expenses", label: "Expenses" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/goals", label: "Goals" },
  { href: "/add", label: "Add" },
] as const;

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Navigation() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Auth pages render their own focused chrome — keep navigation chromeless
  // so users aren't tempted to navigate away mid-flow. The /invite landing
  // page is treated the same way: its main job is "decide whether to sign
  // in", and the full nav would only get in the way.
  const onAuthRoute =
    pathname === "/signin" ||
    pathname === "/register" ||
    pathname?.startsWith("/signin/") ||
    pathname?.startsWith("/register/") ||
    pathname?.startsWith("/invite/");

  if (onAuthRoute) {
    return (
      <header className="sticky top-0 z-30 border-b border-brand-100 bg-white/80 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center px-4 py-3 sm:px-6 lg:px-8">
          <Link
            href="/"
            aria-label="Pido — home"
            className="group flex items-center rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
          >
            <BrandLogo variant="wordmark" />
          </Link>
        </nav>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-30 border-b border-brand-100 bg-white/80 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/"
          aria-label="Pido — home"
          className="group flex items-center rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
        >
          <span className="transition-transform duration-300 group-hover:rotate-[-6deg] group-hover:scale-105">
            <BrandLogo variant="wordmark" />
          </span>
        </Link>

        <ul className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm font-medium transition",
                    active
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                  )}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-2">
          <div className="hidden md:block">
            <WorkspaceSwitcher />
          </div>
          <div className="hidden md:block">
            <UserMenu />
          </div>

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 md:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close navigation" : "Open navigation"}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
              aria-hidden="true"
            >
              {open ? (
                <>
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </>
              ) : (
                <>
                  <path d="M3 6h18" />
                  <path d="M3 12h18" />
                  <path d="M3 18h18" />
                </>
              )}
            </svg>
          </button>
        </div>
      </nav>

      <div
        id="mobile-menu"
        className={cn(
          "overflow-hidden border-t border-slate-200 bg-white transition-[max-height] duration-200 ease-out md:hidden",
          open ? "max-h-72" : "max-h-0",
        )}
      >
        <ul className="space-y-1 px-4 py-3 sm:px-6">
          {NAV_LINKS.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "block rounded-lg px-3 py-2 text-sm font-medium transition",
                    active
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-slate-700 hover:bg-slate-100",
                  )}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="border-t border-slate-200 px-4 py-3 sm:px-6">
          <WorkspaceSwitcher />
          <div className="mt-3">
            <UserMenu />
          </div>
        </div>
      </div>
    </header>
  );
}
