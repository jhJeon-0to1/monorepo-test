import { coreFetch, type CoreFetchOptions } from "../api";

export function testFetch(options?: CoreFetchOptions) {
  return coreFetch<
    Array<{
      id: number;
      title: string;
      body: string;
      userId: number;
    }>
  >("https://jsonplaceholder.typicode.com/posts", options);
}