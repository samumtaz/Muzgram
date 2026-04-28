FROM node:20-alpine
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

RUN pnpm --filter @muzgram/types run build
RUN pnpm --filter @muzgram/constants run build
RUN pnpm --filter @muzgram/utils run build
RUN pnpm --filter @muzgram/api run build

EXPOSE 3000
CMD ["node", "apps/api/dist/apps/api/src/main"]
