# Pido Rich Tracker

A shareable expense + goals tracker with smart analytics.
Built on Next.js 15, React 19, and MongoDB Atlas.

> **Deployment guide** — Atlas provisioning, OAuth, SMTP, Vercel
> walk-through, and the full env-var reference live in
> [`docs/SETUP.md`](./docs/SETUP.md).

---

## Prerequisites

- Node.js **20+**
- Yarn **1.x**
- A MongoDB Atlas cluster

## Quick start

```powershell
yarn install
Copy-Item .env.example .env       # then fill in real values
yarn dev
```

App runs at <http://localhost:3000>. First visit redirects to `/signin`;
register at `/register` (your email must be in `AUTH_ALLOWED_EMAILS`).
On first sign-in the app silently creates a personal workspace, so
there is no empty state.

The full env-var reference lives in
[`docs/SETUP.md`](./docs/SETUP.md#environment-variables).

## Scripts

| Command             | What it does              |
| ------------------- | ------------------------- |
| `yarn dev`          | Dev server with HMR       |
| `yarn build`        | Production build          |
| `yarn start`        | Run the production build  |
| `yarn typecheck`    | `tsc --noEmit`            |
| `yarn lint`         | ESLint                    |
| `yarn lint:fix`     | ESLint with `--fix`       |
| `yarn format`       | Prettier write            |
| `yarn format:check` | Prettier check (no write) |
| `yarn test`         | Vitest (one-shot)         |
| `yarn test:watch`   | Vitest watch mode         |

## Docker

```powershell
docker compose up --build                  # production-like
docker compose --profile dev up --build    # hot-reload dev container
```

## Deployment

Vercel-friendly out of the box (`vercel.json` ships with the secure
defaults). See [`docs/SETUP.md`](./docs/SETUP.md) for the full
walkthrough.

## License

MIT.
