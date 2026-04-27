"use client";

import Link from "next/link";
import { useState } from "react";
import { ErrorBanner, QueryError } from "@frontend/components/ui/ErrorBanner";
import { useCreateFamily, useFamilies } from "../hooks";

/** /families \u2014 list workspaces with a create affordance. */
export function FamiliesView() {
  const { data, isLoading, error, refetch } = useFamilies();
  const [name, setName] = useState("");
  const createFamily = useCreateFamily();

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-brand-900">Workspaces</h1>
        <p className="mt-1 text-sm text-brand-600">
          A workspace is a shared expense + goals account. Invite family members to
          collaborate, or create separate workspaces for different households.
        </p>
      </header>

      <section
        aria-labelledby="create-heading"
        className="mb-8 rounded-lg border border-brand-100 bg-white p-4"
      >
        <h2 id="create-heading" className="text-sm font-semibold text-brand-800">
          Create a new workspace
        </h2>
        <form
          className="mt-3 flex flex-col gap-2 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            const trimmed = name.trim();
            if (!trimmed) return;
            createFamily.mutate(trimmed, {
              onSuccess: () => setName(""),
            });
          }}
        >
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Smith Household"
            maxLength={80}
            className="flex-1 rounded-md border border-brand-200 bg-white px-3 py-2 text-sm text-brand-900 focus:border-brand-400 focus:outline-none"
            aria-label="Workspace name"
          />
          <button
            type="submit"
            disabled={createFamily.isPending || name.trim().length === 0}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {createFamily.isPending ? "Creating…" : "Create workspace"}
          </button>
        </form>
        {createFamily.error ? (
          <ErrorBanner error={createFamily.error} clearOn={createFamily.data} />
        ) : null}
      </section>

      {isLoading ? (
        <p className="text-sm text-brand-500">Loading workspaces…</p>
      ) : error ? (
        <QueryError error={error} onRetry={() => refetch()} />
      ) : !data || data.families.length === 0 ? (
        <p className="text-sm text-brand-500">You&apos;re not in any workspaces yet.</p>
      ) : (
        <ul className="space-y-2">
          {data.families.map((family) => {
            const isActive = family.id === data.activeFamilyId;
            return (
              <li key={family.id}>
                <Link
                  href={{ pathname: "/families/[id]", query: { id: family.id } }}
                  as={`/families/${family.id}`}
                  className="flex items-center justify-between rounded-lg border border-brand-100 bg-white px-4 py-3 transition hover:border-brand-200 hover:bg-brand-50"
                >
                  <div>
                    <div className="font-medium text-brand-900">{family.name}</div>
                    <div className="mt-0.5 text-xs uppercase tracking-wide text-brand-500">
                      {family.role}
                      {isActive ? " · active" : ""}
                    </div>
                  </div>
                  <span aria-hidden className="text-brand-400">
                    →
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
