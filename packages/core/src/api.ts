import { executeRequest, type RequestOptions } from "./request";

export type CoreFetchOptions = Omit<RequestOptions, "method" | "url"> & {
  method?: RequestOptions["method"];
};

export type CoreFetchFunction = <T = unknown>(
  endpoint: string,
  options?: CoreFetchOptions,
) => Promise<T>;

export const coreFetch: CoreFetchFunction = async <T = unknown>(
  endpoint: string,
  options: CoreFetchOptions = {},
): Promise<T> => {
  const { method = "GET", ...rest } = options;

  return executeRequest<T>({
    method,
    url: endpoint,
    ...rest,
  });
};

export * as test from "./api/test";
