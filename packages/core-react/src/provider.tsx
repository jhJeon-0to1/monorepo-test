"use client";

import { type QueryClient,QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import type { ReactNode } from "react";

import {
  type CoreQueryClientOptions,
  getCoreQueryClient,
} from "./query-client";

export type CoreReactProviderProps = {
  children: ReactNode;
  queryClient?: QueryClient;
  onGlobalError?: (error: unknown) => void;
  defaultOptions?: CoreQueryClientOptions["defaultOptions"];
};

export function CoreReactProvider({
  children,
  queryClient,
  onGlobalError,
  defaultOptions,
}: CoreReactProviderProps) {
  const resolvedQueryClient =
    queryClient ??
    getCoreQueryClient({
      onGlobalError,
      defaultOptions,
    });
  const isDevelopment = process.env.NODE_ENV === "development";

  return (
    <QueryClientProvider client={resolvedQueryClient}>
      {children}
      {isDevelopment ? <ReactQueryDevtools initialIsOpen={false} /> : null}
    </QueryClientProvider>
  );
}
