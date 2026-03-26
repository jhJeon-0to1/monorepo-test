"use client";

import {
  AppProviders,
  createClientQueryErrorHandler,
} from "@repo/core-next";
import type { ReactNode } from "react";

const handleClientQueryError = createClientQueryErrorHandler({
  onUnauthorized: () => {
    window.location.href = "/login";
  },
});

type ProvidersProps = {
  children: ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  return (
    <AppProviders onGlobalError={handleClientQueryError}>
      {children}
    </AppProviders>
  );
}
