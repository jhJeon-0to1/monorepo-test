import {
  type DefaultOptions,
  MutationCache,
  QueryCache,
  QueryClient,
} from "@tanstack/react-query";

const defaultQueryOptions: DefaultOptions = {
  queries: {
    staleTime: 30_000,
    retry: 1,
    refetchOnWindowFocus: false,
  },
};

export type CoreQueryClientOptions = {
  onGlobalError?: (error: unknown) => void;
  defaultOptions?: DefaultOptions;
};

export function makeCoreQueryClient({
  onGlobalError,
  defaultOptions,
}: CoreQueryClientOptions = {}) {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: onGlobalError,
    }),
    mutationCache: new MutationCache({
      onError: onGlobalError,
    }),
    defaultOptions: {
      ...defaultQueryOptions,
      ...defaultOptions,
      queries: {
        ...defaultQueryOptions.queries,
        ...defaultOptions?.queries,
      },
      mutations: {
        ...defaultQueryOptions.mutations,
        ...defaultOptions?.mutations,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

function isServerEnvironment() {
  return typeof window === "undefined";
}

export function getCoreQueryClient(
  options: CoreQueryClientOptions = {},
) {
  if (isServerEnvironment()) {
    return makeCoreQueryClient(options);
  }

  if (!browserQueryClient) {
    browserQueryClient = makeCoreQueryClient(options);
  }

  return browserQueryClient;
}

export function createCoreQueryClient(
  options: CoreQueryClientOptions = {},
) {
  return makeCoreQueryClient(options);
}
