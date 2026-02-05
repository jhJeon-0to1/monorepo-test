import { coreFetch, CoreFetchOptions } from "./fetch";

export const testFetch = async (options?: CoreFetchOptions) => {
  return coreFetch<{ id: string }>(
    "https://jsonplaceholder.typicode.com/posts",
    options,
  );
};
