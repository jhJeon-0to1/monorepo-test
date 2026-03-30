FROM node:lts-alpine AS base
RUN npm install -g pnpm turbo
WORKDIR /app

FROM base AS pruner
COPY . .
RUN turbo prune __APPNAME__ --docker

FROM base AS builder
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
RUN pnpm turbo build --filter=__APPNAME__

FROM node:lts-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/apps/__APPNAME__/public ./apps/__APPNAME__/public
COPY --from=builder /app/apps/__APPNAME__/.next/standalone ./
COPY --from=builder /app/apps/__APPNAME__/.next/static ./apps/__APPNAME__/.next/static

EXPOSE 3000

CMD ["node", "apps/__APPNAME__/server.js"]
