"use client";

import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ErrorBanner } from "@frontend/components/ui/ErrorBanner";
import { useAcceptInvite, useInvitePreview } from "../hooks";

interface Props {
  token: string;
}

/** Public invite landing page (`/invite/<token>`) \u2014 preview, then accept. */
export function AcceptInviteView({ token }: Props) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { data: preview, isLoading, error } = useInvitePreview(token);
  const accept = useAcceptInvite();

  if (isLoading || status === "loading") {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-sm text-brand-500">Checking your invite…</p>
      </main>
    );
  }

  if (error || !preview) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-brand-900">Invalid invite</h1>
        <p className="mt-2 text-sm text-brand-600">
          This invite link is invalid, expired, or has already been used. Ask the
          workspace owner to send you a fresh one.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
        >
          Back to home
        </Link>
      </main>
    );
  }

  const signedIn = Boolean(session?.user);
  const sessionEmail = session?.user?.email?.toLowerCase() ?? "";
  const inviteEmail = preview.email.toLowerCase();
  const emailMatches = signedIn && sessionEmail === inviteEmail;

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <div className="rounded-lg border border-brand-100 bg-white p-6 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-brand-500">Invitation</p>
        <h1 className="mt-2 text-xl font-semibold text-brand-900">
          Join {preview.familyName}
        </h1>
        <p className="mt-2 text-sm text-brand-600">
          {preview.inviterName} invited <strong>{preview.email}</strong> to share this
          workspace on Pido Rich Tracker.
        </p>
        <p className="mt-1 text-xs text-brand-500">
          Expires {new Date(preview.expiresAt).toLocaleString()}.
        </p>

        <div className="mt-6">
          {!signedIn ? (
            <button
              type="button"
              onClick={() => {
                void signIn(undefined, {
                  callbackUrl: `/invite/${token}`,
                });
              }}
              className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
            >
              Sign in as {preview.email} to accept
            </button>
          ) : !emailMatches ? (
            <div className="space-y-3">
              <p className="text-sm text-red-700">
                You&apos;re signed in as <strong>{session?.user?.email}</strong>, but this
                invite is for <strong>{preview.email}</strong>. Sign out and back in with
                the invited address to accept.
              </p>
              <Link
                href="/api/auth/signout"
                className="block w-full rounded-md border border-brand-200 px-4 py-2 text-center text-sm text-brand-800 transition hover:bg-brand-50"
              >
                Sign out
              </Link>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                accept.mutate(token, {
                  onSuccess: () => router.push("/"),
                });
              }}
              disabled={accept.isPending}
              className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
            >
              {accept.isPending
                ? "Joining…"
                : `Accept and switch to ${preview.familyName}`}
            </button>
          )}
          {accept.error ? (
            <ErrorBanner className="mt-3" error={accept.error} clearOn={accept.data} />
          ) : null}
        </div>
      </div>
    </main>
  );
}
