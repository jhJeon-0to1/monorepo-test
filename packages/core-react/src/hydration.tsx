import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { getCoreQueryClient } from "./query-client";

type CoreQueryHydrationProps = {
  children: ReactNode;
  prefetch: (
    queryClient: ReturnType<typeof getCoreQueryClient>,
  ) => Promise<void>;
};

export async function CoreQueryHydration({
  children,
  prefetch,
}: CoreQueryHydrationProps) {
  const queryClient = getCoreQueryClient();

  await prefetch(queryClient);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {children}
    </HydrationBoundary>
  );
}
