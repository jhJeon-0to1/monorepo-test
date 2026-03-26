import { z } from "zod";

export const articleStatusSchema = z.enum([
  "draft",
  "review",
  "published",
  "archived",
]);

export type ArticleStatus = z.infer<typeof articleStatusSchema>;

export const articleSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: articleStatusSchema,
  body: z.string(),
  publishedAt: z.string().nullable().optional(),
});

export type Article = z.infer<typeof articleSchema>;
