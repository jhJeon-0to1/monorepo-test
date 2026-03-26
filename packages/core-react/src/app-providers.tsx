"use client";

import type { QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";

import {
  CoreReactProvider,
  type CoreReactProviderProps,
} from "./provider";
import { createClientQueryErrorHandler } from "./query-error-handler";

export type AppProvidersProps = {
  children: ReactNode;
  queryClient?: QueryClient;
  defaultOptions?: CoreReactProviderProps["defaultOptions"];
  onGlobalError?: CoreReactProviderProps["onGlobalError"];
};

export function AppProviders({
  children,
  queryClient,
  defaultOptions,
  onGlobalError,
}: AppProvidersProps) {
  return (
    <CoreReactProvider
      queryClient={queryClient}
      defaultOptions={defaultOptions}
      onGlobalError={
        onGlobalError ?? createClientQueryErrorHandler()
      }
    >
      {children}
    </CoreReactProvider>
  );
}
