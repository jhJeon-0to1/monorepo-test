"use client";

import * as api from "@repo/core/api";

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

export const authApi = new Proxy(api, {
  get(target, prop, receiver) {
    const originalValue = Reflect.get(target, prop, receiver);

    if (typeof originalValue === "function") {
      const requestFunction = originalValue as (...args: unknown[]) => unknown;

      return (...args: unknown[]) => {
        return requestFunction(...withClientAuthOptions(args));
      };
    }

    return originalValue;
  },
}) as typeof api;
