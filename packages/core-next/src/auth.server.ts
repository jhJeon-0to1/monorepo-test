import "server-only";

import { cookies } from "next/headers";

const AUTH_COOKIE_NAMES = ["session", "access_token", "refresh_token"] as const;

type RequestOptionsLike = {
  headers?: HeadersInit;
};

function isRequestOptionsLike(value: unknown): value is RequestOptionsLike {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mergeCookieHeader(
  headers: HeadersInit | undefined,
  cookieHeader: string,
) {
  const nextHeaders = new Headers(headers);
  const existingCookieHeader = nextHeaders.get("Cookie");

  nextHeaders.set(
    "Cookie",
    existingCookieHeader
      ? `${existingCookieHeader}; ${cookieHeader}`
      : cookieHeader,
  );

  return nextHeaders;
}

function createAuthCookieHeader(
  cookieNames: readonly string[],
  cookieStore: Awaited<ReturnType<typeof cookies>>,
) {
  return cookieNames
    .map((cookieName) => cookieStore.get(cookieName))
    .filter((cookie) => cookie !== undefined)
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
}

function withServerAuthHeaders(args: unknown[], cookieHeader: string) {
  if (!cookieHeader) {
    return args;
  }

  const nextArgs = [...args];
  const lastArg = nextArgs.at(-1);

  if (!isRequestOptionsLike(lastArg)) {
    nextArgs.push({
      headers: mergeCookieHeader(undefined, cookieHeader),
    });

    return nextArgs;
  }

  nextArgs[nextArgs.length - 1] = {
    ...lastArg,
    headers: mergeCookieHeader(lastArg.headers, cookieHeader),
  };

  return nextArgs;
}

type AsyncRequestFunction = (...args: unknown[]) => Promise<unknown>;

export function withServerAuth<TRequestFunction extends AsyncRequestFunction>(
  requestFunction: TRequestFunction,
): TRequestFunction {
  return (async (...args: Parameters<TRequestFunction>) => {
    const cookieStore = await cookies();
    const cookieHeader = createAuthCookieHeader(AUTH_COOKIE_NAMES, cookieStore);

    return requestFunction(
      ...(withServerAuthHeaders(args, cookieHeader) as Parameters<TRequestFunction>),
    );
  }) as TRequestFunction;
}
