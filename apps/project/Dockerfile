# 1. Base 이미지
FROM node:lts-alpine AS base
RUN npm install -g pnpm turbo
WORKDIR /app

# 2. Prune 단계 (루트의 모든 파일을 보고 필요한 것만 추출)
FROM base AS pruner
COPY . .
# 여기서 @repo/web은 실제 package.json의 name입니다.
RUN turbo prune project --out-dir=out --docker

# 3. Build 단계
FROM base AS builder
WORKDIR /app

# 의존성 설치를 위해 json 파일들 먼저 복사
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile

# 실제 소스 코드 복사 (여기에 turbo.json이 포함되어 있음)
COPY --from=pruner /app/out/full/ .
# 별도의 COPY turbo.json turbo.json 줄은 삭제하세요. 이미 위 줄에서 복사되었습니다.

RUN pnpm turbo build --filter=project

# 4. Runner 단계 (생략 - 이전과 동일)
FROM nginx:stable-alpine AS runner
# 빌드된 dist 경로를 확인하여 복사 (보통 apps/앱이름/dist)
COPY --from=builder /app/apps/project/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]