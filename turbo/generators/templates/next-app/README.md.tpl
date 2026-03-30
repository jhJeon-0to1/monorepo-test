# [[APPNAME]]

`[[APP_PATH]]`는 monorepo generator로 만든 Next.js 앱입니다. `create-next-app` 기본 scaffold 위에 공용 설정과 core wiring이 이미 연결되어 있습니다.

## 빠른 시작

레포 루트에서 실행하세요.

```bash
pnpm install
pnpm --filter "./apps/[[APPNAME]]" dev
```

자주 쓰는 명령:

```bash
pnpm --filter "./apps/[[APPNAME]]" lint
pnpm --filter "./apps/[[APPNAME]]" check-types
pnpm --filter "./apps/[[APPNAME]]" build
```

## 환경 변수

generator가 `[[ENV_FILE_PATH]]`를 같이 만들었습니다.

```env
[[ENV_SNIPPET]]
```

- `[[SITE_ID_ENV_KEY]]`: 현재 값은 `[[SITE_ID]]`
- `[[BASE_URL_ENV_KEY]]`: 현재 값은 `[[BASE_URL]]`

## 기본 연결

- `[[LAYOUT_PATH]]`: `CoreBootstrap`와 `Providers`를 연결합니다.
- `[[PROVIDERS_PATH]]`: `AppProviders`와 전역 query 에러 핸들러를 연결합니다.
- `[[PAGE_PATH]]`: 첫 페이지 예시입니다.
- `[[GLOBAL_ERROR_PATH]]`: 전역 에러 UI입니다.

지금 layout은 이미 `process.env.[[SITE_ID_ENV_KEY]]`와 `process.env.[[BASE_URL_ENV_KEY]]`를 읽도록 연결되어 있습니다. 보통은 `.env.local` 값만 바꾸시면 됩니다.

## API 사용 규칙

API 함수는 항상 `@repo/core/api/*`에서 직접 import합니다.

```tsx
import { testFetch } from "@repo/core/api/test";

export default async function Page() {
  const data = await testFetch();

  return <pre>{JSON.stringify(data, null, 2)}</pre>;
}
```

다음 패턴은 피해주세요.

- `@repo/core` 루트에 API를 다시 모으기
- `@repo/core-next`에서 API를 가져오기

## 새 API 추가하기

새 API는 `packages/core/src/api/*.ts`에 파일 단위로 추가합니다.

```ts
import { z } from "zod";

import { coreFetch, type CoreFetchOptions } from "../api";
import { parseWithSchema } from "../schema-utils";

const articleSchema = z.object({
  id: z.number(),
  title: z.string(),
});

const articleListSchema = z.array(articleSchema);

export async function listArticles(options?: CoreFetchOptions) {
  const payload = await coreFetch<unknown>("/articles", {
    ...options,
    baseUrl: "https://api.example.com",
  });

  return parseWithSchema(articleListSchema, payload);
}
```

앱에서는 바로 이렇게 가져다 쓰시면 됩니다.

```ts
import { listArticles } from "@repo/core/api/article";
```

## 인증 포함 호출

서버 컴포넌트나 route handler에서는 `withServerAuth()`를 붙이면 됩니다.

```tsx
import { testFetch } from "@repo/core/api/test";
import { withServerAuth } from "@repo/core-next/server-auth";

const authTestFetch = withServerAuth(testFetch);
const data = await authTestFetch();
```

클라이언트 호출에서 쿠키를 같이 보내려면 `withClientAuth()`를 사용하세요.

```tsx
import { testFetch } from "@repo/core/api/test";
import { withClientAuth } from "@repo/core-next/client-auth";

const authTestFetch = withClientAuth(testFetch);
const data = await authTestFetch();
```

## 더 보기

공통 규칙과 패키지 구조는 [루트 README]([[ROOT_README_PATH]])를 참고해주세요.
