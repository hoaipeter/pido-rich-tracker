"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";
import { useConfirm } from "@frontend/components/ui/ConfirmDialog";
import { ErrorBanner } from "@frontend/components/ui/ErrorBanner";
import { useDeleteAccount, useUpdateMyName } from "../hooks";

/** /account — update display name; delete account (with type-to-confirm). */
export function AccountView() {
  const { data: session, status } = useSession();
  const confirm = useConfirm();

  const updateName = useUpdateMyName();
  const deleteAccount = useDeleteAccount();

  const [name, setName] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");

  // Seed the name input once the session arrives (one-shot, then
  // user-controlled). Using setState-during-render so no effect is needed.
  const [seeded, setSeeded] = useState(false);
  if (!seeded && session?.user?.name) {
    setSeeded(true);
    setName(session.user.name);
  }

  if (status === "loading") {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-brand-500 text-sm">Loading…</p>
      </main>
    );
  }
  if (!session?.user) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-brand-600 text-sm">
          You need to be signed in.{" "}
          <Link href="/signin" className="text-brand-700 underline">
            Sign in
          </Link>
        </p>
      </main>
    );
  }

  const trimmed = name.trim();
  const dirty = trimmed.length > 0 && trimmed !== (session.user.name ?? "").trim();

  return (
    <main className="mx-auto max-w-2xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <header>
        <p className="text-brand-500 text-xs tracking-wide uppercase">Account</p>
        <h1 className="text-brand-900 mt-1 text-2xl font-semibold">Your profile</h1>
        <p className="text-brand-600 mt-1 text-sm">
          Signed in as <span className="font-medium">{session.user.email}</span>.
        </p>
      </header>

      <section className="border-brand-100 rounded-lg border bg-white p-4">
        <h2 className="text-brand-800 text-sm font-semibold">Display name</h2>
        <p className="text-brand-500 mt-1 text-xs">
          Shown to other members of your workspaces. Email cannot be changed.
        </p>
        <form
          className="mt-3 flex flex-col gap-2 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            if (!dirty) return;
            updateName.mutate({ name: trimmed });
          }}
        >
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
            placeholder="Your name"
            className="border-brand-200 text-brand-900 focus:border-brand-400 flex-1 rounded-md border bg-white px-3 py-2 text-sm focus:outline-none"
            aria-label="Display name"
          />
          <button
            type="submit"
            disabled={!dirty || updateName.isPending}
            className="bg-brand-600 hover:bg-brand-700 rounded-md px-4 py-2 text-sm font-medium text-white transition disabled:opacity-60"
          >
            {updateName.isPending ? "Saving…" : "Save"}
          </button>
        </form>
        {updateName.error ? (
          <ErrorBanner error={updateName.error} clearOn={updateName.data} />
        ) : null}
        {updateName.isSuccess && !dirty ? (
          <p className="text-brand-500 mt-2 text-xs">Name updated.</p>
        ) : null}
      </section>

      <section className="rounded-lg border border-red-200 bg-red-50 p-4">
        <h2 className="text-sm font-semibold text-red-800">Delete account</h2>
        <p className="mt-1 text-xs text-red-700">
          Permanently deletes your account, your solo workspaces, and all expenses and
          goals in them. Workspaces shared with co-owners are left intact — your
          membership is removed instead. If you are the sole owner of a shared workspace,
          you must transfer ownership first.
        </p>
        <label className="mt-3 block text-xs font-medium text-red-800">
          Type your email (<span className="font-mono">{session.user.email}</span>) to
          confirm:
          <input
            type="email"
            inputMode="email"
            autoComplete="off"
            spellCheck={false}
            value={confirmEmail}
            onChange={(event) => setConfirmEmail(event.target.value)}
            className="mt-1 block w-full rounded-md border border-red-200 bg-white px-3 py-2 text-sm text-red-900 focus:border-red-400 focus:outline-none"
            placeholder={session.user.email ?? ""}
            aria-label="Type your email to confirm account deletion"
          />
        </label>
        <button
          type="button"
          onClick={async () => {
            const expected = (session.user?.email ?? "").trim().toLowerCase();
            const supplied = confirmEmail.trim().toLowerCase();
            if (!expected || supplied !== expected) {
              return;
            }
            const ok = await confirm({
              title: "Delete your account?",
              description:
                "This permanently deletes your account, your solo workspaces, and every expense and goal inside them. This cannot be undone.",
              confirmLabel: "Delete account",
              tone: "danger",
            });
            if (!ok) return;
            deleteAccount.mutate({ confirmEmail: supplied });
          }}
          disabled={
            deleteAccount.isPending ||
            confirmEmail.trim().toLowerCase() !==
              (session.user?.email ?? "").trim().toLowerCase()
          }
          className="mt-3 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-60"
        >
          {deleteAccount.isPending ? "Deleting…" : "Delete my account"}
        </button>
        {deleteAccount.error ? (
          <ErrorBanner error={deleteAccount.error} variant="card" />
        ) : null}
      </section>
    </main>
  );
}
