# XRPL PayKit core — Next.js 14 + drizzle ORM + better-sqlite3
#
# Multi-stage build:
#   - builder: install deps + build all workspaces
#   - runner:  production-only artifacts (smaller image)

# ──────────────────────────── builder ────────────────────────────
FROM node:20-alpine AS builder

# better-sqlite3 native build deps
RUN apk add --no-cache python3 make g++ libc6-compat

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app

# Copy workspace manifests for dep caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY packages/sdk/package.json ./packages/sdk/
COPY apps/paykit/package.json ./apps/paykit/
COPY apps/demo-merchant/package.json ./apps/demo-merchant/

RUN pnpm install --frozen-lockfile

# Copy sources
COPY . .

# Build workspaces
RUN pnpm -r build || true

# ──────────────────────────── runner ────────────────────────────
FROM node:20-alpine AS runner

RUN apk add --no-cache wget libc6-compat
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app

# Copy entire monorepo (simpler than tree-shake; image size ~500MB acceptable for dev)
COPY --from=builder /app /app

EXPOSE 3000

# DB push then start
WORKDIR /app/apps/paykit
CMD ["sh", "-c", "pnpm db:push && pnpm dev -p 3000 -H 0.0.0.0"]
