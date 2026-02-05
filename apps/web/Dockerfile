# 1단계: Base 설정
FROM node:lts-alpine AS base
RUN npm install -g pnpm turbo
WORKDIR /app

# 2단계: Prune - 필요한 패키지만 추출
FROM base AS pruner
COPY . .
# 💡 @repo/web은 apps/web/package.json의 "name" 필드값입니다.
RUN turbo prune web --docker

# 3단계: Build - 의존성 설치 및 빌드
FROM base AS builder
WORKDIR /app

# 캐시 효율을 위해 json 파일만 먼저 복사하여 설치
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --no-frozen-lockfile

# 전체 소스 코드 복사 (out/full에 이미 turbo.json이 포함됨)
COPY --from=pruner /app/out/full/ .
RUN pnpm turbo build --filter=web

# 4단계: Runner - 실행 전용 이미지
FROM node:lts-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
# Cloud Run 등에서 사용할 포트 (기본 3000)
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# standalone 실행에 필요한 최소 파일만 복사
# 💡 경로 주의: apps/web 부분은 실제 본인의 폴더 구조를 따라갑니다.
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static

EXPOSE 3000

# standalone 모드에서는 서버를 node로 직접 실행합니다.
CMD ["node", "apps/web/server.js"]