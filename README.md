# Pido Rich Tracker

Personal expense tracker with analytics, forecasts, recurring detection,
and goals. Built on Next.js 15 + MongoDB Atlas.

> Full project reference (architecture, APIs, algorithms, history) lives
> in [PROJECT.md](./PROJECT.md).

---

## Prerequisites

- Node.js 20+
- Yarn 1.x
- A MongoDB Atlas cluster (free M0 is fine)

## Setup

```powershell
yarn install
Copy-Item .env.example .env
# Edit .env:
#   MONGODB_URI, MONGODB_DB
#   AUTH_SECRET (generate via: openssl rand -base64 32)
#   AUTH_URL=http://localhost:3000
#   AUTH_TRUST_HOST=true   (dev only; on Vercel rely on AUTH_URL)
#   AUTH_ALLOWED_EMAILS=you@example.com,teammate@example.com
#   (optional) AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET
yarn dev
```

App runs at <http://localhost:3000>. First visit redirects to
`/signin`; create your account at `/register` (the email must be in
`AUTH_ALLOWED_EMAILS`).

## Scripts

| Command           | What it does             |
| ----------------- | ------------------------ |
| `yarn dev`        | Dev server with HMR      |
| `yarn build`      | Production build         |
| `yarn start`      | Run the production build |
| `yarn typecheck`  | `tsc --noEmit`           |
| `yarn lint`       | ESLint                   |
| `yarn lint:fix`   | ESLint with `--fix`      |
| `yarn format`     | Prettier write           |
| `yarn test`       | Vitest (one-shot)        |
| `yarn test:watch` | Vitest watch mode        |

## Docker (optional)

```powershell
docker compose up --build                  # production-like
docker compose --profile dev up --build    # hot-reload dev container
```

## Project layout (high level)

```
src/
  app/         Next.js App Router routes + API handlers
  backend/     Repositories + services (MongoDB)
  frontend/    Feature slices: api-client, hooks, lib, components, views
  shared/      Zod schemas shared between client and server
```

Path aliases: `@/*`, `@backend/*`, `@frontend/*`, `@shared/*`.

## Authentication

- **Auth.js v5** with JWT sessions (no DB session lookup per request).
- **Credentials** (email + password) and **Google OAuth** (optional).
- **Closed allowlist**: only emails in `AUTH_ALLOWED_EMAILS` can register
  or sign in. Google sign-in for unlisted emails is rejected by the
  `signIn` callback.
- **Password policy**: min 12 chars with uppercase, lowercase, and a digit.
  Hashed with bcrypt (cost 12).
- **Per-user scoping**: every expense / goal / contribution is keyed by
  `userId` at the repository layer. Compound indexes prefix every read.
- **Edge-safe middleware** redirects unauthenticated requests to `/signin`
  (HTML routes) or returns `401` JSON (`/api/*`).
- **Hardening**: same-origin guard + IP rate-limit (5/hour) on
  `/api/auth/register`; security headers on all routes; `Cache-Control:
no-store` on `/api/*`.

### Google OAuth setup

1. Google Cloud Console → APIs & Services → Credentials → Create OAuth
   Client ID (Web).
2. Authorized JavaScript origins: `https://your-domain.com` (and
   `http://localhost:3000` for dev).
3. Authorized redirect URIs:
   `https://your-domain.com/api/auth/callback/google` (and the localhost
   equivalent).
4. Copy the Client ID / Secret into `AUTH_GOOGLE_ID` and
   `AUTH_GOOGLE_SECRET`. Both must be set to enable the Google button.

## Vercel deployment

Set these environment variables in the Vercel project (Production +
Preview):

| Variable              | Required | Notes                                      |
| --------------------- | -------- | ------------------------------------------ |
| `MONGODB_URI`         | yes      | Atlas SRV connection string                |
| `MONGODB_DB`          | yes      | Database name                              |
| `AUTH_SECRET`         | yes      | 32+ chars; `openssl rand -base64 32`       |
| `AUTH_URL`            | yes      | Public URL, e.g. `https://your-domain.com` |
| `AUTH_TRUST_HOST`     | no       | Leave unset on Vercel; rely on `AUTH_URL`  |
| `AUTH_ALLOWED_EMAILS` | yes      | Comma-separated allowlist                  |
| `AUTH_GOOGLE_ID`      | no       | Required to enable Google sign-in          |
| `AUTH_GOOGLE_SECRET`  | no       | Pair with `AUTH_GOOGLE_ID`                 |

Atlas IP access list must include `0.0.0.0/0` (or Vercel's egress
ranges). Build/install commands are pinned in `vercel.json`.

## Wiping existing single-tenant data

If you're migrating from a pre-auth deployment, drop legacy collections
and let the indexes rebuild on first use:

```js
// mongosh
db.expenses.drop();
db.goals.drop();
db.goal_contributions.drop();
// Auth.js collections (only if you previously test-ran auth):
db.users.drop();
db.accounts.drop();
db.sessions.drop();
db.verification_tokens.drop();
```
