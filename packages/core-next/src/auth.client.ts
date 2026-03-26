"use client";

type RequestOptionsLike = {
  credentials?: RequestCredentials;
};

function isRequestOptionsLike(value: unknown): value is RequestOptionsLike {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function withClientAuthOptions(args: unknown[]) {
  const nextArgs = [...args];
  const lastArg = nextArgs.at(-1);

  if (!isRequestOptionsLike(lastArg)) {
    nextArgs.push({
      credentials: "include" satisfies RequestCredentials,
    });

    return nextArgs;
  }

  nextArgs[nextArgs.length - 1] = {
    ...lastArg,
    credentials: "include" satisfies RequestCredentials,
  };

  return nextArgs;
}

type AsyncRequestFunction = (...args: unknown[]) => Promise<unknown>;

export function withClientAuth<TRequestFunction extends AsyncRequestFunction>(
  requestFunction: TRequestFunction,
): TRequestFunction {
  return ((...args: Parameters<TRequestFunction>) => {
    return requestFunction(
      ...(withClientAuthOptions(args) as Parameters<TRequestFunction>),
    );
  }) as TRequestFunction;
}
