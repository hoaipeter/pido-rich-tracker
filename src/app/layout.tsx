import type { Metadata } from "next";
import { headers } from "next/headers";
import Script from "next/script";
import "./globals.css";
import { Navigation } from "@frontend/components/layout/Navigation";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Pido — Pig & Dog Expense Tracker",
  description:
    "A cozy pink-pastel expense tracker. Track personal spending, visualize trends, and get smart monthly insights — brought to you by Pido (pig + dog).",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="en">
      <head>
        {/* Nonce forwarded to Next.js so its inline hydration scripts pass CSP. */}
        {nonce && (
          <Script
            id="nonce-init"
            nonce={nonce}
            strategy="beforeInteractive"
            dangerouslySetInnerHTML={{ __html: "" }}
          />
        )}
      </head>
      <body
        className="min-h-screen bg-cream-50 bg-brand-gradient text-slate-900"
        suppressHydrationWarning
      >
        <Providers>
          <Navigation />
          <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
