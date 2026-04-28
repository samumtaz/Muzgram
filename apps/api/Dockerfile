FROM node:20-alpine
WORKDIR /app

# Install pnpm via corepack
RUN npm install -g corepack@latest && corepack enable && corepack prepare pnpm@9.14.0 --activate

# Copy manifests first for layer caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
COPY packages/constants/package.json ./packages/constants/
COPY apps/api/package.json ./apps/api/

# Install all deps (devDeps needed for nest build)
RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/ ./packages/
COPY apps/api/src ./apps/api/src
COPY apps/api/tsconfig.json apps/api/nest-cli.json ./apps/api/

# Compile TypeScript
RUN cd apps/api && node_modules/.bin/nest build

EXPOSE 3000
CMD ["node", "apps/api/dist/main"]
