FROM node:20-alpine AS builder
WORKDIR /app

RUN npm install -g corepack@latest && corepack enable && corepack prepare pnpm@9.14.0 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
COPY packages/constants/package.json ./packages/constants/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile

COPY packages/ ./packages/
COPY apps/api/src ./apps/api/src
COPY apps/api/tsconfig.json apps/api/nest-cli.json ./apps/api/

# Build workspace packages so their dist/ exists for nest build path resolution
RUN pnpm --filter @muzgram/types run build
RUN pnpm --filter @muzgram/constants run build
RUN pnpm --filter @muzgram/utils run build

# Compile API TypeScript to JS — runs in builder with plenty of RAM
RUN pnpm --filter @muzgram/api run build

# ── Runtime stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

RUN npm install -g corepack@latest && corepack enable && corepack prepare pnpm@9.14.0 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
COPY packages/constants/package.json ./packages/constants/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile --prod

# Copy compiled output from builder
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/constants/dist ./packages/constants/dist
COPY --from=builder /app/packages/utils/dist ./packages/utils/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist

EXPOSE 3000
CMD ["node", "apps/api/dist/main"]
