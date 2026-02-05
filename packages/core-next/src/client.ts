"use client";

import * as core from "@repo/core";
import { initCore } from "@repo/core";
import { EXCLUDED_FUNCTIONS } from "./constant";

export const api = core;

export function CoreInitializer({
  siteId,
  baseUrl,
}: {
  siteId: string;
  baseUrl?: string;
}) {
  initCore(siteId, baseUrl);
  return null;
}

export const authApi = new Proxy(core, {
  get(target, prop, receiver) {
    const originalValue = Reflect.get(target, prop, receiver);
    if (
      typeof originalValue === "function" &&
      !EXCLUDED_FUNCTIONS.includes(prop.toString())
    ) {
      return (...args: any[]) => {
        let options = args[args.length - 1];

        if (
          typeof options !== "object" ||
          options === null ||
          Array.isArray(options)
        ) {
          options = {};
          args.push(options);
        }

        options.credentials = "include";

        return originalValue(...args);
      };
    }
    return originalValue;
  },
}) as typeof core;
