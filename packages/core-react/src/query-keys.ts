type QueryKeyValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Record<string, unknown>
  | readonly unknown[];

export function createQueryKeys<const TScope extends string>(scope: TScope) {
  return {
    all: [scope] as const,
    lists: () => [scope, "list"] as const,
    list: <TParams extends QueryKeyValue>(params?: TParams) =>
      params === undefined
        ? ([scope, "list"] as const)
        : ([scope, "list", params] as const),
    details: () => [scope, "detail"] as const,
    detail: <TId extends QueryKeyValue>(id: TId) =>
      [scope, "detail", id] as const,
  };
}
