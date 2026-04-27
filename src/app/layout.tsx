import type { Metadata } from "next";
import "./globals.css";
import { Navigation } from "@frontend/components/layout/Navigation";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Pido — Pig & Dog Expense Tracker",
  description:
    "A cozy pink-pastel expense tracker. Track personal spending, visualize trends, and get smart monthly insights — brought to you by Pido (pig + dog).",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
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
