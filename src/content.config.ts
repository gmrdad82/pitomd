import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const saidBlog = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/said-blog" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    published: z.boolean().default(false),
    pinned: z.boolean().default(false),
    pinExcerpt: z.string().optional(),
  }),
});

export const collections = { saidBlog };
