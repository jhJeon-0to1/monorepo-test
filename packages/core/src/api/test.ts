import { z } from "zod";

import { coreFetch, type CoreFetchOptions } from "../api";
import { parseWithSchema } from "../schema-utils";

const testPostSchema = z.object({
  id: z.number(),
  title: z.string(),
  body: z.string(),
  userId: z.number(),
});

const testPostListSchema = z.array(testPostSchema);

type TestPost = z.infer<typeof testPostSchema>;

export async function testFetch(
  options?: CoreFetchOptions,
): Promise<TestPost[]> {
  const payload = await coreFetch<unknown>(
    "https://jsonplaceholder.typicode.com/posts",
    options,
  );

  return parseWithSchema(testPostListSchema, payload);
}
