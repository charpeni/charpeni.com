import { glob } from 'astro/loaders';
import { defineCollection, z } from 'astro:content';

/**
 * Blog posts — the same ../posts/*.mdx files the Next.js site used, loaded
 * in place. The schema covers the AUTHORED frontmatter fields; the fields
 * the old `PostFrontMatter` type computed at build time derive elsewhere:
 * - `slug` → `entry.id` (from the filename)
 * - `wordCount` / `readingTime` → computed from `entry.body`
 *   (src/utils/postMeta.ts, same reading-time package)
 * - `ogImage` → filesystem fallback to a generated OG card
 * - `blurDataURL` → plaiceholder at render time for banner blur-up
 */
const posts = defineCollection({
  loader: glob({ pattern: '*.mdx', base: './posts' }),
  schema: z.object({
    title: z.string(),
    publishedAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }).optional(),
    summary: z.string(),
    image: z.string().startsWith('/').optional(),
    tags: z.array(z.string()).default([]),
    /** Display name of the series this post belongs to; posts sharing the
     * same value are grouped and ordered by publishedAt (SeriesStack). */
    series: z.string().optional(),
  }),
});

export const collections = { posts };
