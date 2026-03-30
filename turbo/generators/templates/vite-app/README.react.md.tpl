# [[APPNAME]]

`[[APP_PATH]]`는 monorepo generator로 만든 React + Vite 앱입니다. 공용 설정과 provider wiring이 이미 연결되어 있습니다.

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

- `[[ENTRY_PATH]]`: env 값을 읽어 `initCore()`와 `<Providers><App /></Providers>`를 연결합니다.
- `[[PROVIDERS_PATH]]`: `AppProviders`와 전역 query 에러 핸들러를 연결합니다.

지금 엔트리 파일은 이미 `import.meta.env.[[SITE_ID_ENV_KEY]]`와 `import.meta.env.[[BASE_URL_ENV_KEY]]`를 읽어서 `initCore()`를 호출하도록 연결되어 있습니다.

## API 사용 규칙

API 함수는 항상 `@repo/core/api/*`에서 직접 import합니다.

```tsx
import { useEffect, useState } from "react";

import { testFetch } from "@repo/core/api/test";

export function Example() {
  const [items, setItems] = useState<unknown[]>([]);

  useEffect(() => {
    testFetch().then(setItems);
  }, []);

  return <pre>{JSON.stringify(items, null, 2)}</pre>;
}
```

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

브라우저에서 쿠키를 같이 보내려면 `withClientAuth()`를 사용하세요.

```ts
import { testFetch } from "@repo/core/api/test";
import { withClientAuth } from "@repo/core-react";

const authTestFetch = withClientAuth(testFetch);
const data = await authTestFetch();
```

## 더 보기

공통 규칙과 패키지 구조는 [루트 README]([[ROOT_README_PATH]])를 참고해주세요.
