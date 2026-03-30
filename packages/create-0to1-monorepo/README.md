# create-0to1-monorepo

`pnpm create 0to1-monorepo`로 현재 모노레포 템플릿을 새 디렉터리에 복사하는 create package입니다.

## Usage

```bash
pnpm create 0to1-monorepo my-monorepo
```

의존성 설치를 생략하려면:

```bash
pnpm create 0to1-monorepo my-monorepo --no-install
```

## Publish flow

이 패키지는 `prepack` 시점에 현재 워크스페이스를 `template/`으로 복사해서 publish 가능한 상태를 만듭니다.
