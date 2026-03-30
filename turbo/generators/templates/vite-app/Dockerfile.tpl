FROM node:lts-alpine AS base
RUN npm install -g pnpm turbo
WORKDIR /app

FROM base AS pruner
COPY . .
RUN turbo prune __APPNAME__ --out-dir=out --docker

FROM base AS builder
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
RUN pnpm turbo build --filter=__APPNAME__

FROM nginx:stable-alpine AS runner
COPY --from=builder /app/apps/__APPNAME__/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
