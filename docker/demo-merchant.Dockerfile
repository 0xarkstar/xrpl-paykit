# XRPL PayKit demo-merchant — Premium AI Search · Fan Art Image Unlock examples
#
# Same monorepo, different entrypoint. depends_on paykit (port 3000).

FROM node:20-alpine

RUN apk add --no-cache wget libc6-compat
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app

# Copy workspace manifests
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY packages/sdk/package.json ./packages/sdk/
COPY apps/demo-merchant/package.json ./apps/demo-merchant/

RUN pnpm install --frozen-lockfile

# Copy sources
COPY packages/sdk ./packages/sdk
COPY apps/demo-merchant ./apps/demo-merchant

EXPOSE 3001

WORKDIR /app/apps/demo-merchant
CMD ["pnpm", "dev", "-p", "3001", "-H", "0.0.0.0"]
