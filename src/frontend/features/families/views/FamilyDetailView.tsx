"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useConfirm } from "@frontend/components/ui/ConfirmDialog";
import { ErrorBanner, QueryError } from "@frontend/components/ui/ErrorBanner";
import {
  useFamily,
  useFamilyInvites,
  useFamilyMembers,
  useCreateInvite,
  useRemoveMember,
  useRenameFamily,
  useRevokeInvite,
  useSetActiveFamily,
  useSetMemberRole,
} from "../hooks";

interface Props {
  familyId: string;
}

export function FamilyDetailView({ familyId }: Props) {
  const router = useRouter();
  const confirm = useConfirm();
  const { data: session } = useSession();
  const family = useFamily(familyId);
  const members = useFamilyMembers(familyId);
  const invites = useFamilyInvites(familyId);

  const renameMutation = useRenameFamily();
  const setActiveMutation = useSetActiveFamily();
  const removeMember = useRemoveMember(familyId);
  const setMemberRole = useSetMemberRole(familyId);
  const createInvite = useCreateInvite(familyId);
  const revokeInvite = useRevokeInvite(familyId);

  const [renameValue, setRenameValue] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  // The unhashed invite URL is returned ONCE by the create-invite API
  // and surfaced to the user as a copyable fallback in case email
  // delivery flaked. We deliberately don't persist it anywhere.
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);

  // Auto-dismiss the "Invite created" banner after a short window so it
  // doesn't linger forever once the inviter has copied the URL. Cleared
  // explicitly on revoke as well (see revoke handler below).
  useEffect(() => {
    if (!lastInviteUrl) return;
    const timer = window.setTimeout(() => setLastInviteUrl(null), 8000);
    return () => window.clearTimeout(timer);
  }, [lastInviteUrl]);

  if (!family) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-sm text-brand-500">Loading workspace…</p>
      </main>
    );
  }

  const currentUserId = session?.user?.id;
  const isOwner = family.role === "owner";
  const isActive = session?.user?.activeFamilyId === family.id;

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <header>
        <p className="text-xs uppercase tracking-wide text-brand-500">Workspace</p>
        <h1 className="mt-1 text-2xl font-semibold text-brand-900">{family.name}</h1>
        <p className="mt-1 text-sm text-brand-600">
          You are a {family.role} of this workspace
          {isActive ? " · currently active" : ""}.
        </p>
        {!isActive ? (
          <button
            type="button"
            onClick={() => {
              setActiveMutation.mutate(family.id, {
                onSuccess: () => router.refresh(),
              });
            }}
            disabled={setActiveMutation.isPending}
            className="mt-3 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            {setActiveMutation.isPending ? "Switching…" : "Switch to this workspace"}
          </button>
        ) : null}
      </header>

      {isOwner ? (
        <section className="rounded-lg border border-brand-100 bg-white p-4">
          <h2 className="text-sm font-semibold text-brand-800">Rename workspace</h2>
          <form
            className="mt-3 flex flex-col gap-2 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              const trimmed = renameValue.trim();
              if (!trimmed) return;
              renameMutation.mutate(
                { id: family.id, name: trimmed },
                { onSuccess: () => setRenameValue("") },
              );
            }}
          >
            <input
              type="text"
              value={renameValue}
              onChange={(event) => setRenameValue(event.target.value)}
              placeholder={family.name}
              maxLength={80}
              className="flex-1 rounded-md border border-brand-200 bg-white px-3 py-2 text-sm text-brand-900 focus:border-brand-400 focus:outline-none"
              aria-label="New workspace name"
            />
            <button
              type="submit"
              disabled={renameMutation.isPending || renameValue.trim().length === 0}
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
            >
              Save
            </button>
          </form>
          {renameMutation.error ? (
            <ErrorBanner error={renameMutation.error} clearOn={renameMutation.data} />
          ) : null}
        </section>
      ) : null}

      <section className="rounded-lg border border-brand-100 bg-white p-4">
        <h2 className="text-sm font-semibold text-brand-800">
          Members {members.data ? `(${members.data.length})` : ""}
        </h2>
        {isOwner ? (
          <p className="mt-1 text-xs text-brand-500">
            Owners can invite, remove, and promote other members. Workspaces support
            multiple owners.
          </p>
        ) : null}
        {members.isLoading ? (
          <p className="mt-2 text-sm text-brand-500">Loading members…</p>
        ) : members.error ? (
          <QueryError
            className="mt-2"
            error={members.error}
            onRetry={() => members.refetch()}
          />
        ) : (
          <ul className="mt-3 divide-y divide-brand-100">
            {members.data?.map((member) => {
              const isSelf = member.userId === currentUserId;
              const ownerCount =
                members.data?.filter((m) => m.role === "owner").length ?? 0;
              const isOwnerRow = member.role === "owner";
              // A sole owner cannot leave their own workspace (server would
              // 409 LAST_OWNER). Hide the button so users don't see an action
              // that always fails. They must promote someone else first, or
              // delete the workspace from the danger zone.
              const isSoleOwner = isSelf && isOwnerRow && ownerCount <= 1;
              const canRemove = (isOwner || isSelf) && !isSoleOwner;
              // Owner-only role-management actions. We hide promote/demote
              // entirely for non-owners; the server enforces too. We also
              // suppress the demote button for the very last owner so the
              // user doesn't see a button that always 409s.
              const canPromote = isOwner && !isOwnerRow;
              const canDemote = isOwner && isOwnerRow && ownerCount > 1;
              const roleBusy =
                setMemberRole.isPending &&
                setMemberRole.variables?.userId === member.userId;
              return (
                <li
                  key={member.id}
                  className="flex flex-col gap-2 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 font-medium text-brand-900">
                      <span className="truncate">{member.name || member.email}</span>
                      {isSelf ? (
                        <span className="text-xs font-normal text-brand-500">(you)</span>
                      ) : null}
                      <span
                        className={
                          isOwnerRow
                            ? "rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800"
                            : "rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700"
                        }
                      >
                        {member.role}
                      </span>
                    </div>
                    <div className="truncate text-xs text-brand-500">{member.email}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {canPromote ? (
                      <button
                        type="button"
                        onClick={async () => {
                          const ok = await confirm({
                            title: "Make owner?",
                            description: `Promote ${
                              member.name || member.email
                            } to owner? They will be able to invite, remove, rename, and delete this workspace.`,
                            confirmLabel: "Make owner",
                            tone: "primary",
                          });
                          if (!ok) return;
                          setMemberRole.mutate({
                            userId: member.userId,
                            role: "owner",
                            affectsSelf: isSelf,
                          });
                        }}
                        disabled={roleBusy || setMemberRole.isPending}
                        className="rounded-md border border-brand-200 px-3 py-1 text-xs font-medium text-brand-700 transition hover:bg-brand-50 disabled:opacity-60"
                      >
                        {roleBusy ? "Working…" : "Make owner"}
                      </button>
                    ) : null}
                    {canDemote ? (
                      <button
                        type="button"
                        onClick={async () => {
                          const ok = await confirm({
                            title: isSelf ? "Step down as owner?" : "Demote owner?",
                            description: isSelf
                              ? "You'll lose owner-only abilities (invite, remove, rename, delete) on this workspace. The other owners will keep theirs."
                              : `Demote ${
                                  member.name || member.email
                                } from owner to member?`,
                            confirmLabel: isSelf ? "Step down" : "Demote",
                            tone: "danger",
                          });
                          if (!ok) return;
                          setMemberRole.mutate({
                            userId: member.userId,
                            role: "member",
                            affectsSelf: isSelf,
                          });
                        }}
                        disabled={roleBusy || setMemberRole.isPending}
                        className="rounded-md border border-amber-200 px-3 py-1 text-xs font-medium text-amber-800 transition hover:bg-amber-50 disabled:opacity-60"
                      >
                        {roleBusy ? "Working…" : isSelf ? "Step down" : "Demote"}
                      </button>
                    ) : null}
                    {canRemove ? (
                      <button
                        type="button"
                        onClick={async () => {
                          const ok = await confirm({
                            title: isSelf ? "Leave workspace?" : "Remove member?",
                            description: isSelf
                              ? "You'll lose access to this workspace's expenses and goals."
                              : `Remove ${member.name || member.email} from this workspace?`,
                            confirmLabel: isSelf ? "Leave" : "Remove",
                            tone: "danger",
                          });
                          if (!ok) return;
                          removeMember.mutate(
                            { userId: member.userId, isSelf },
                            {
                              onSuccess: () => {
                                if (isSelf) router.push("/families");
                              },
                            },
                          );
                        }}
                        disabled={removeMember.isPending}
                        className="rounded-md border border-red-200 px-3 py-1 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-60"
                      >
                        {isSelf ? "Leave" : "Remove"}
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {removeMember.error ? <ErrorBanner error={removeMember.error} /> : null}
        {setMemberRole.error ? <ErrorBanner error={setMemberRole.error} /> : null}
      </section>

      {isOwner ? (
        <section className="rounded-lg border border-brand-100 bg-white p-4">
          <h2 className="text-sm font-semibold text-brand-800">Invite by email</h2>
          <p className="mt-1 text-xs text-brand-500">
            We&apos;ll email a single-use link that expires in 7 days. The invite is bound
            to the email address — only that address can accept it.
          </p>
          <form
            className="mt-3 flex flex-col gap-2 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              const email = inviteEmail.trim();
              if (!email) return;
              setLastInviteUrl(null);
              createInvite.mutate(email, {
                onSuccess: (result) => {
                  setInviteEmail("");
                  setLastInviteUrl(result.inviteUrl);
                },
              });
            }}
          >
            <input
              type="email"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="member@example.com"
              className="flex-1 rounded-md border border-brand-200 bg-white px-3 py-2 text-sm text-brand-900 focus:border-brand-400 focus:outline-none"
              aria-label="Invitee email"
              required
            />
            <button
              type="submit"
              disabled={createInvite.isPending || inviteEmail.trim().length === 0}
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
            >
              {createInvite.isPending ? "Sending…" : "Send invite"}
            </button>
          </form>
          {createInvite.error ? (
            <ErrorBanner error={createInvite.error} clearOn={createInvite.data} />
          ) : null}
          {lastInviteUrl ? <InviteUrlReveal url={lastInviteUrl} /> : null}

          <h3 className="mt-6 text-sm font-semibold text-brand-800">Pending invites</h3>
          {invites.isLoading ? (
            <p className="mt-2 text-sm text-brand-500">Loading…</p>
          ) : invites.error ? (
            <QueryError
              className="mt-2"
              error={invites.error}
              onRetry={() => invites.refetch()}
            />
          ) : invites.data && invites.data.length > 0 ? (
            <ul className="mt-2 divide-y divide-brand-100">
              {invites.data.map((invite) => (
                <li
                  key={invite.id}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <div>
                    <div className="text-brand-900">{invite.email}</div>
                    <div className="text-xs text-brand-500">
                      Expires {new Date(invite.expiresAt).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await confirm({
                        title: "Revoke invite?",
                        description: `Revoke the pending invite for ${invite.email}? The link will stop working immediately.`,
                        confirmLabel: "Revoke",
                        tone: "danger",
                      });
                      if (!ok) return;
                      setLastInviteUrl(null);
                      revokeInvite.mutate(invite.id);
                    }}
                    disabled={revokeInvite.isPending}
                    className="rounded-md border border-red-200 px-3 py-1 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-60"
                  >
                    Revoke
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-brand-500">No pending invites.</p>
          )}
        </section>
      ) : null}
    </main>
  );
}

/**
 * Single-use invite URL reveal. The URL is the only time the unhashed
 * token is exposed to a browser, so it stays masked behind a button
 * until the inviter explicitly chooses to copy it. Auto-clears after
 * a fresh render of the parent (the parent timer drops `lastInviteUrl`
 * after 8 seconds).
 */
function InviteUrlReveal({ url }: { url: string }) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2500);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const handleCopy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      }
      setCopied(true);
    } catch {
      setRevealed(true);
    }
  };

  return (
    <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
      <p className="font-medium">Invite created.</p>
      <p className="mt-1">
        If the email doesn&apos;t arrive, share the link with the invitee. The link is
        single-use and reveals access on click.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleCopy}
          className="rounded bg-emerald-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-emerald-700"
        >
          {copied ? "Copied" : "Copy invite link"}
        </button>
        <button
          type="button"
          onClick={() => setRevealed((value) => !value)}
          className="rounded border border-emerald-300 px-2 py-1 text-[11px] font-medium text-emerald-800 hover:bg-emerald-100"
          aria-pressed={revealed}
        >
          {revealed ? "Hide link" : "Show link"}
        </button>
      </div>
      {revealed ? (
        <code
          className="mt-2 block break-all rounded bg-white px-2 py-1 font-mono text-[11px]"
          aria-label="Invite URL (single use)"
        >
          {url}
        </code>
      ) : null}
    </div>
  );
}
