# syntax=docker/dockerfile:1.7
#
# Production image for Pido Rich Tracker.
# Multi-stage build:
#   1. deps      — install dependencies in an isolated layer (good cache hit rate)
#   2. builder   — `next build` with the standalone output target
#   3. runner    — minimal runtime: standalone bundle + non-root user + tini PID1
#
# Build:   docker build -t pido-rich-tracker:latest .
# Run:     docker run --rm --env-file .env -p 3000:3000 pido-rich-tracker:latest

# Pinning to a digest (e.g. node:20.18-alpine@sha256:...) is recommended in
# production. CI tools like Renovate/Dependabot can keep the digest fresh.
ARG NODE_VERSION=20.18-alpine

# ---- Base ---------------------------------------------------------------
FROM node:${NODE_VERSION} AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 \
    YARN_CACHE_FOLDER=/root/.yarn

# ---- Dependencies -------------------------------------------------------
FROM base AS deps
# libc6-compat is required by some Node.js native modules on Alpine.
RUN apk add --no-cache libc6-compat
COPY package.json yarn.lock* ./
# Cache yarn downloads across builds (BuildKit). --frozen-lockfile guarantees
# reproducible builds; --network-timeout protects against flaky CI runners.
# --ignore-scripts blocks any postinstall script in transitive deps from
# executing during image build (a known supply-chain vector). Re-enable
# selectively only if a dep documents a required postinstall step.
RUN --mount=type=cache,target=/root/.yarn \
    yarn install --frozen-lockfile --ignore-scripts --network-timeout 600000

# ---- Builder ------------------------------------------------------------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Next.js expects /public to exist even when the project ships none.
RUN mkdir -p /app/public
# Placeholder env vars satisfy the Zod boot-time validator. Real values are
# injected at runtime via env_file / Vercel project env vars — never bake
# secrets into the image.
ENV MONGODB_URI=mongodb://build-placeholder:27017 \
    AUTH_SECRET=build-placeholder-secret-must-be-32-characters \
    AUTH_ALLOWED_EMAILS=build@placeholder.local
RUN yarn build

# ---- Runner -------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# tini gives us proper PID1 semantics: SIGTERM forwards to Node, zombies are
# reaped, and `docker stop` results in a graceful shutdown rather than a
# 10-second timeout + SIGKILL.
# Only tini is added — the healthcheck uses Node's built-in http module
# instead of wget/curl to keep the runtime image lean and shrink attack surface.
RUN apk add --no-cache tini \
    && addgroup -g 1001 -S nodejs \
    && adduser -S -u 1001 -G nodejs nextjs

# next.config.mjs has `output: "standalone"`; this copies the minimal
# node_modules + server.js the runtime actually needs.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000

# Container-level health probe. The Next.js root route returns HTML when the
# server is responsive (auth middleware handles the redirect); a 2xx/3xx is
# enough to confirm the process is alive and accepting connections.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "require('http').get('http://127.0.0.1:3000/',r=>{process.exit(r.statusCode<500?0:1)}).on('error',()=>process.exit(1))"

# OCI image metadata — surfaced by registries and `docker inspect`.
LABEL org.opencontainers.image.title="Pido Rich Tracker" \
    org.opencontainers.image.description="Shareable expense + goals tracker (Next.js 15 + MongoDB Atlas)" \
    org.opencontainers.image.source="https://github.com/hoaipeter/pido-rich-tracker" \
    org.opencontainers.image.licenses="MIT"

# Make graceful shutdown explicit. tini forwards this to Node, which Next.js
# handles by closing in-flight connections.
STOPSIGNAL SIGTERM

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
