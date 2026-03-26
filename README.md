# AI CMS Monorepo

단일 Next.js 앱을 기준으로 CMS 프론트엔드와 공통 패키지를 관리하는 모노레포입니다.

현재 구조는 다음 전제를 기준으로 정리되어 있습니다.

- 앱 코드는 named export만 사용합니다.
- API 함수는 `@repo/core/api/*`에서 직접 import 합니다.
- `@repo/core-next`는 Next.js 전용 기능만 제공합니다.
- `ui` 패키지는 별도 디자인 시스템으로 보고, fetch/error/core-next/eslint 정리와 분리해서 유지합니다.

## 전제

- 현재 `initCore()`는 module-scoped state를 사용합니다.
- 그래서 `siteId`와 `baseUrl`이 앱 단위로 고정되는 구조를 전제로 합니다.
- 고객사별로 앱이 아예 분리 배포되거나, 앱 하나가 사실상 고정 설정으로 운영되는 경우에는 지금 구조로 충분합니다.
- 하나의 서버 프로세스가 요청마다 다른 `siteId`를 처리하는 진짜 멀티테넌트 구조로 가면, 이 초기화 방식은 나중에 바꿔야 합니다.

## 폴더 구조

- `apps/web`: Next.js App Router 예제 앱
- `apps/next`: Next.js 예제 앱
- `apps/project`: Vite 예제 앱
- `packages/core`: 프레임워크 비의존 fetch, request, error, core API
- `packages/core-next`: Next.js 전용 bootstrap, auth wrapper
- `packages/ui`: 공용 UI 패키지
- `packages/eslint-config`: 공용 ESLint 설정
- `packages/typescript-config`: 공용 TypeScript 설정

## 실행

```bash
pnpm install
pnpm dev
```

자주 쓰는 명령:

```bash
pnpm build
pnpm lint
pnpm check-types
```

## 패키지 규칙

### `@repo/core`

역할:

- 순수 request 실행기
- 공용 에러 타입과 정규화
- API 함수 구현

공개 경로:

- `@repo/core`
- `@repo/core/api/*`

루트 export에는 다음 성격의 것만 둡니다.

- `initCore`
- request 타입
- error 타입/유틸

API 함수는 루트에 다시 모으지 않습니다.

이유:

- 파일 하나 만들고 바로 import 가능해야 합니다.
- 중앙 barrel 파일을 계속 수정하지 않기 위해서입니다.
- 클라이언트 번들에서 tree-shaking이 잘 되게 하기 위해서입니다.

예시:

```ts
import { initCore } from "@repo/core";
import { testFetch } from "@repo/core/api/test";
```

### `@repo/core-next`

역할:

- Next.js 환경에서 필요한 부가 기능만 제공
- `@repo/core` API를 다시 pass-through 하지 않음

공개 경로:

- `@repo/core-next/bootstrap`
- `@repo/core-next/server-auth`
- `@repo/core-next/client-auth`

이 패키지에는 API 함수 자체를 두지 않습니다. API 함수는 항상 `@repo/core/api/*`에서 직접 가져옵니다.

## 사용법

### 1. 앱 초기화

Next.js에서는 루트 레이아웃에 `CoreBootstrap`을 한 번만 둡니다.

```tsx
import "./globals.css";

import { CoreBootstrap } from "@repo/core-next/bootstrap";

const SITE_ID = "a";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <CoreBootstrap siteId={SITE_ID} />
        {children}
      </body>
    </html>
  );
}
```

동작:

- 서버 렌더 시 한 번 초기화
- 클라이언트 하이드레이션 시 한 번 초기화

주의:

- 이 방식은 `siteId`/`baseUrl`이 앱에서 사실상 고정일 때를 전제로 합니다.

### 2. API 함수 작성

API 함수는 `packages/core/src/api/*` 아래 파일별로 작성합니다.

예시:

```ts
// packages/core/src/api/test.ts
import { coreFetch, type CoreFetchOptions } from "../api";

export function testFetch(options?: CoreFetchOptions) {
  return coreFetch("https://jsonplaceholder.typicode.com/posts", options);
}
```

사용:

```ts
import { testFetch } from "@repo/core/api/test";
```

규칙:

- 각 파일에서 named export
- 루트 `@repo/core`로 다시 모으지 않음
- 새 API를 추가할 때 `package.json`이나 중앙 export 파일을 건드리지 않음

### 3. 서버에서 인증 쿠키와 함께 호출

서버에서는 `withServerAuth()`로 API 함수를 감쌉니다.

```ts
import { testFetch } from "@repo/core/api/test";
import { withServerAuth } from "@repo/core-next/server-auth";

const authTestFetch = withServerAuth(testFetch);
const data = await authTestFetch();
```

현재 동작:

- `next/headers`의 `cookies()` 사용
- allowlist 쿠키만 `Cookie` 헤더에 붙임

현재 allowlist:

- `session`
- `access_token`
- `refresh_token`

### 4. 클라이언트에서 인증 포함 호출

클라이언트에서는 `withClientAuth()`로 API 함수를 감쌉니다.

```ts
import { testFetch } from "@repo/core/api/test";
import { withClientAuth } from "@repo/core-next/client-auth";

const authTestFetch = withClientAuth(testFetch);
const data = await authTestFetch();
```

현재 동작:

- 마지막 인자를 request options로 보고 `credentials: "include"`를 주입합니다.

전제:

- API 함수 시그니처는 마지막 인자가 request options인 형태여야 합니다.

예:

- `fn(options?)`
- `fn(id, options?)`
- `fn(endpoint, options?)`

## 왜 이렇게 나눴는가

### named export 유지

프로젝트에서는 다음처럼 함수만 직접 가져옵니다.

```ts
import { testFetch } from "@repo/core/api/test";
```

이 구조가 객체 API나 `Proxy` 기반 API보다 tree-shaking에 유리합니다.

### 중앙 barrel 수정 최소화

새 API를 추가할 때 보통 이 파일만 만들면 됩니다.

```text
packages/core/src/api/some-domain.ts
```

추가로 `index.ts`나 `core-next/server.ts` 같은 파일을 계속 수정하지 않아도 됩니다.

### `core-next` 역할 축소

`@repo/core-next`는 API 재수출 레이어가 아니라 Next.js 전용 헬퍼 레이어로 유지합니다.

## 주의사항

### `initCore()`는 전역 상태입니다

현재 `initCore()`는 내부 module state를 수정합니다.

즉, 이 구조는 다음 케이스에 적합합니다.

- 앱 전체에서 `siteId`가 고정
- 환경별로만 `baseUrl`이 달라짐

다음 케이스에는 적합하지 않습니다.

- 요청마다 다른 tenant의 `siteId`를 써야 하는 단일 앱

그 요구가 실제로 생기면 그때는 전역 초기화 대신 request-scoped context 구조로 바꿔야 합니다.

### `withClientAuth()`와 `withServerAuth()`는 wrapper입니다

이 함수들은 API 함수를 감싸는 방식입니다. `authApi` 같은 객체를 만들지 않는 이유는 클라이언트에서 tree-shaking 손해를 줄이기 위해서입니다.

## 예제

### Next.js 서버 컴포넌트

```tsx
import { testFetch } from "@repo/core/api/test";

export default async function Page() {
  const data = await testFetch();

  return <pre>{JSON.stringify(data, null, 2)}</pre>;
}
```

### Next.js 서버 컴포넌트 + 인증 쿠키 전달

```tsx
import { testFetch } from "@repo/core/api/test";
import { withServerAuth } from "@repo/core-next/server-auth";

const authTestFetch = withServerAuth(testFetch);

export default async function Page() {
  const data = await authTestFetch();

  return <pre>{JSON.stringify(data, null, 2)}</pre>;
}
```

### Vite 앱

```ts
import { initCore } from "@repo/core";
import { testFetch } from "@repo/core/api/test";

initCore("a");

const data = await testFetch();
```

## 정리

- API 함수는 `@repo/core/api/*`에서 직접 import
- Next.js 전용 기능은 `@repo/core-next`에서만 제공
- `CoreBootstrap`은 현재 싱글 설정 전제에서 사용
- 멀티테넌트 단일 앱 요구가 생기기 전까지는 지금 구조를 유지
