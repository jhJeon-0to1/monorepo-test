import "server-only";
import * as core from "@repo/core";
import { cookies } from "next/headers";
import { EXCLUDED_FUNCTIONS } from "./constant";

export const api = core;

export const authApi = new Proxy(core, {
  get(target, prop, receiver) {
    const original = Reflect.get(target, prop, receiver);
    if (
      typeof original === "function" &&
      !EXCLUDED_FUNCTIONS.includes(prop.toString())
    ) {
      return async (...args: any[]) => {
        const cookieStore = await cookies();
        const cookieString = cookieStore.toString();

        const lastArg = args[args.length - 1];
        const isObject =
          typeof lastArg === "object" &&
          lastArg !== null &&
          !Array.isArray(lastArg);

        const newOptions = isObject ? { ...lastArg } : {};
        newOptions.headers = {
          ...newOptions.headers,
          Cookie: cookieString,
        };

        const newArgs = isObject
          ? [...args.slice(0, -1), newOptions]
          : [...args, newOptions];

        return original(...newArgs);
      };
    }
    return original;
  },
}) as typeof core;
