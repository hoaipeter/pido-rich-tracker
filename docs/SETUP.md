# Pido Rich Tracker — Setup Guide

This document walks you through provisioning every external dependency
the app needs, configuring environment variables, and deploying to
Vercel. It also covers running the project locally for development.

The app is a Next.js 15 (App Router) project that uses:

- **MongoDB** as the only datastore (a single Atlas cluster is fine).
- **Auth.js v5** for authentication (Credentials + Google OAuth).
- **SMTP** (optional, free via Gmail App Password) for sending invite emails.
- **Vercel** as the recommended hosting target.

---

## Architecture in 60 seconds

The data model is **per-family**, not per-user. A _family_ (or
"workspace") is a shared bucket for expenses and goals. Every user
belongs to one or more families and has exactly one _active_ family
at a time.

- **Bootstrap.** When a user signs up (Credentials) or signs in for
  the first time (OAuth), the app silently creates a personal family
  named `${userName}'s Workspace` and adds them as the owner. They
  never see an empty state.
- **Sharing.** An owner invites someone by email. The server generates
  a single-use, cryptographically random token (32 bytes → base64url),
  stores only its SHA-256 hash, sends the invite link via SMTP, and
  expires the token after 7 days. The invitee opens the link, signs in
  with the matching email, and is added as a member.
- **Active workspace.** The active family lives both on the user
  document (`activeFamilyId`) and on the JWT (`fid`, `role`, `mv`).
  The JWT also carries a `mv` (membership version) snapshot so a
  removed member can be revoked promptly. The actual revocation gate
  is implemented as a live membership lookup inside
  `getCurrentFamilyContext()` — if the user is no longer in the
  family's roster, the request is rejected with `STALE_MEMBERSHIP`.
- **Edge vs Node.** Auth middleware runs on the Edge runtime and only
  inspects the JWT — no database calls. All API routes that touch
  data are explicitly `runtime = "nodejs"` so they can use the
  MongoDB driver.

---

## Environment variables

Every variable is read in [src/backend/config/env.ts](src/backend/config/env.ts)
and validated at startup. Missing required variables fail fast with a
helpful message.

| Variable                                | Required?                   | What it's for                                                                                                                                                                              |
| --------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `MONGODB_URI`                           | yes                         | MongoDB connection string. Atlas SRV URI works as-is.                                                                                                                                      |
| `MONGODB_DB`                            | no (default `pido_tracker`) | Database name.                                                                                                                                                                             |
| `AUTH_SECRET`                           | yes                         | Random 32+ char string. Generate with `openssl rand -base64 32`.                                                                                                                           |
| `AUTH_URL`                              | yes in prod                 | Public origin (e.g. `https://pido.app`). Vercel auto-injects from `VERCEL_URL`.                                                                                                            |
| `AUTH_TRUST_HOST`                       | no                          | Set `true` for non-Vercel hosts behind a proxy.                                                                                                                                            |
| `AUTH_ALLOWED_EMAILS`                   | yes                         | Comma-separated allowlist for self-registration. Invite tokens bypass this.                                                                                                                |
| `AUTH_GOOGLE_ID`                        | no                          | Google OAuth client ID. Provider only registers when both ID + secret are set.                                                                                                             |
| `AUTH_GOOGLE_SECRET`                    | no                          | Google OAuth client secret.                                                                                                                                                                |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | no                          | **Free email delivery** via SMTP (e.g. Gmail App Password — no domain required). Set all three together. When unset, invite emails are no-op'd and the raw URL is returned to the inviter. |
| `SMTP_PORT`                             | no (default `587`)          | `587` for STARTTLS, `465` for implicit TLS.                                                                                                                                                |
| `SMTP_SECURE`                           | no (default `false`)        | `true` only for port 465.                                                                                                                                                                  |
| `EMAIL_FROM`                            | no                          | Optional From-header override. Most providers (Gmail in particular) rewrite this to `SMTP_USER`, so leave blank unless your provider accepts custom senders.                               |
| `APP_URL`                               | no                          | Public origin used to build invite URLs. Defaults to `AUTH_URL` / `NEXTAUTH_URL` / `http://localhost:3000`.                                                                                |

### `.env.local` example for local dev

```dotenv
MONGODB_URI=mongodb+srv://USER:PASS@cluster0.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=pido_tracker

AUTH_SECRET=replace-with-openssl-rand-base64-32
AUTH_URL=http://localhost:3000
AUTH_ALLOWED_EMAILS=you@example.com,partner@example.com

# Optional — leave unset if you don't want OAuth locally.
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=

# Optional — free email via Gmail SMTP. Leave SMTP_PASS blank to skip.
# See section 4 for App Password setup.
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=
APP_URL=http://localhost:3000
```

---

## 1. Provision MongoDB Atlas

1. Sign up at <https://cloud.mongodb.com> and create a free **M0**
   cluster (any region close to your Vercel region).
2. **Database access** → add a user. Use a strong random password.
3. **Network access** → for production, allow `0.0.0.0/0` (Vercel
   doesn't expose static egress IPs on the hobby tier). For local
   dev, also add your current IP.
4. **Connect** → "Drivers" → copy the SRV connection string. Replace
   `<password>` with the user password and append `/?retryWrites=true&w=majority`
   if missing. Set this as `MONGODB_URI`.
5. The app creates indexes lazily on first use, so there is **no**
   manual schema/index step. The database itself is auto-created on
   first write.

> **Note:** the project intentionally does not migrate from older
> per-user data. If you're upgrading from a pre-family-groups version,
> drop the `expenses`, `goals`, `goal_contributions`, `users`,
> `accounts`, and `sessions` collections before first run.

---

## 2. Generate `AUTH_SECRET`

```bash
openssl rand -base64 32
```

Paste the result into `.env.local` as `AUTH_SECRET` and into Vercel's
project environment variables.

---

## 3. (Optional) Configure Google OAuth

Skip this if you only need email/password sign-in.

1. Open <https://console.cloud.google.com> and create (or pick) a
   project.
2. **APIs & Services → OAuth consent screen.** Choose **External**,
   fill the app name + support email, add yourself as a test user.
   You don't need to publish the consent screen for personal use.
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID.**
   - Application type: **Web application**.
   - **Authorized JavaScript origins**:
     - `http://localhost:3000`
     - `https://YOUR-DOMAIN` (the production URL).
   - **Authorized redirect URIs**:
     - `http://localhost:3000/api/auth/callback/google`
     - `https://YOUR-DOMAIN/api/auth/callback/google`
4. Copy the **Client ID** → `AUTH_GOOGLE_ID` and **Client secret** →
   `AUTH_GOOGLE_SECRET`. Provider registration is gated on both being
   set, so half-configured states are silently dropped.

> The first time a Google account signs in, the app calls
> `familyService.ensureActiveFamily` from the JWT callback, which
> auto-creates a personal workspace named after the user. They land
> straight on `/`.

---

## 4. Configure email delivery

You have two choices:

### Option A — None (dev / personal use)

Skip this section entirely. Invite creation still works; the server
logs `[email:noop] would send to=… subject=… tag=…` and the API
response includes the raw invite URL. The inviter sees that URL in a
copyable banner — paste it into Slack/WhatsApp/SMS and you're done.

### Option B — Gmail SMTP (FREE, no domain required) ★ recommended

The simplest free path with real email delivery. No DNS, no SPF/DKIM,
no verified domain. Works with any Gmail or Google Workspace account.

1. Sign in to your Google account → <https://myaccount.google.com/security>.
2. Enable **2-Step Verification** if it's not already on. App passwords
   are not available without 2-Step.
3. Open <https://myaccount.google.com/apppasswords>. Name the app
   anything (e.g. _Pido Tracker_) → **Create**. Copy the 16-character
   password (shown once, no spaces).
4. Set the env vars:

   ```dotenv
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your.address@gmail.com
   SMTP_PASS=the-16-char-app-password
   ```

5. Done. Free quota is ~500 messages/day for personal Gmail and
   ~2000/day for Workspace — plenty for invite traffic.

> **Note:** the `From` header on outgoing mail will always be your
> Gmail address, regardless of `EMAIL_FROM`. That's a Gmail policy,
> not a config issue. Other SMTP providers (Mailtrap, Brevo, etc.)
> work too — just swap `SMTP_HOST` and credentials.

Email send failures are **non-fatal** — the invite-creation API logs
a warning and still succeeds, and the inviter sees the raw URL in the
response as a fallback.

---

## 5. Deploy to Vercel

1. Push the repo to GitHub / GitLab / Bitbucket.
2. <https://vercel.com/new> → import the project.
3. **Framework preset:** Next.js (auto-detected). Build command, output
   directory, install command can stay on defaults.
4. **Environment variables.** Add every variable from the table above
   that applies. At minimum:
   - `MONGODB_URI`
   - `AUTH_SECRET`
   - `AUTH_ALLOWED_EMAILS`
   - (If using OAuth) `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`
   - (If using Gmail SMTP) `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`

   `AUTH_URL` is set automatically by Vercel from `VERCEL_URL`.

5. **Deploy.** First build takes ~2 minutes. After the first deploy,
   visit `/register` (the allowlist applies here) or `/signin` with
   Google.
6. **Custom domain.** Add your domain under **Settings → Domains**.
   Once it's live, **revisit Google's OAuth credentials** and add the
   custom domain as both an authorized JavaScript origin and a
   redirect URI; otherwise OAuth fails on the production URL.

> **Build output:** the project sets `output: "standalone"` in
> `next.config.mjs`. Vercel handles this transparently; if you self-host,
> you can use the standalone server in `.next/standalone/`.

---

## 6. First-run walkthrough

1. Open the deployed URL — you'll be redirected to `/signin`.
2. Sign in with Google or hit `/register` to create a credentials
   account (your email must be in `AUTH_ALLOWED_EMAILS`).
3. The app silently creates `${yourName}'s Workspace` and lands you
   on `/` with empty state.
4. Open the user menu → **Workspaces** (or visit `/families`).
5. **Create workspace** to spin up a second one (e.g. _Smith Household_).
6. Inside a workspace, open **Invite by email**, send an invite. If
   SMTP is configured, the recipient gets a styled email; otherwise
   copy the URL shown in the success banner.
7. The invitee signs in with the **same email** the invite was sent
   to, hits the invite URL, clicks **Accept**. Their active workspace
   is switched to the joined family automatically.
8. Either user can switch between workspaces from the dropdown next
   to the user avatar; data scoping flips on the next request.

---

## 7. Local development

```bash
yarn install
cp .env.example .env.local   # then edit .env.local
yarn dev
```

Useful scripts:

- `yarn dev` — Next dev server on port 3000.
- `yarn typecheck` — `tsc --noEmit` over the whole repo.
- `yarn lint` — ESLint (also run as part of `yarn build`).
- `yarn build` — Production build (also runs lint + typecheck).
- `yarn test` — Vitest unit tests.

The dev server uses the same `.env.local` file as production. If
SMTP is unset, invite creation logs

```
[email:noop] would send to=member@example.com subject="..." tag=invite:<id>
```

to the terminal and returns the raw URL in the API response — copy it
into another browser to test the accept flow without leaving localhost.

---

## 8. Troubleshooting

| Symptom                                                  | Likely cause                                                                                     | Fix                                                                                                                                 |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `MONGODB_URI is required` at startup                     | `.env.local` not loaded or variable typo.                                                        | Confirm the file is in the repo root and the dev server has been restarted.                                                         |
| `AUTH_SECRET must be at least 32 chars`                  | Default placeholder string.                                                                      | Run `openssl rand -base64 32` and paste the result.                                                                                 |
| OAuth redirects to "redirect_uri_mismatch".              | Custom domain not added to Google credentials.                                                   | Add `https://YOUR-DOMAIN/api/auth/callback/google` to the Google OAuth client.                                                      |
| Invite email never arrives.                              | SMTP not configured, or send failed.                                                             | Set the `SMTP_*` triple (Gmail App Password is the fastest free option). As a workaround, copy the URL shown in the success banner. |
| Gmail SMTP returns `Username and Password not accepted`. | Used your Gmail login password instead of an App Password, or 2-Step Verification isn't enabled. | Enable 2-Step Verification, then create an App Password at <https://myaccount.google.com/apppasswords>.                             |
| Removed member can still load the app momentarily.       | They have a stale JWT.                                                                           | Their next API call hits `getCurrentFamilyContext()`, which throws `STALE_MEMBERSHIP` (401) and forces a sign-out on the client.    |
| `Unauthorized` after switching workspaces.               | The JWT didn't refresh.                                                                          | The UI calls `session.update()` after every active-family change; if you customised the flow, ensure that's still the case.         |

---

## 9. Security notes

- Invite tokens are **never persisted in plaintext** — only their
  SHA-256 hash. The unhashed token only exists in the URL emitted at
  creation, sent via email, and shown to the inviter as a one-time
  copyable fallback.
- The invite-creation API requires owner role; revocation does too.
  The accept API requires the signed-in user's email to match the
  invite email exactly (case-insensitive).
- An invite can only be used once; the server uses an atomic
  conditional update (`status: open, expiresAt: > now`) so concurrent
  acceptors get `INVITE_ALREADY_USED`.
- Removing a member bumps the family's `membershipVersion` and clears
  their `activeFamilyId` if it pointed at this family. Their next
  request fails with `STALE_MEMBERSHIP` (HTTP 401).
- Allowlisted self-registration via `/register` continues to use
  `AUTH_ALLOWED_EMAILS`. Invite acceptance bypasses the allowlist
  intentionally — that's the only way externally-invited members can
  join.
