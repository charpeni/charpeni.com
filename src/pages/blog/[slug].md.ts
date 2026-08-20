import { getCollection } from 'astro:content';

import {
  getAbsolutizedSource,
  markdownResponse,
} from '@/utils/markdownSource';

import type { APIRoute } from 'astro';
import type { CollectionEntry } from 'astro:content';

/**
 * Static markdown per post at /blog/[slug].md — the new canonical Markdown
 * URL, replacing the runtime route pages/api/blog/[slug].ts. Prerendered at
 * build time and served as a plain static asset with no function
 * invocation. The legacy /api/blog/[slug].md path is kept alive by
 * src/pages/api/blog/[slug].md.ts (same content) because that URL is
 * pinned in already-published llms.txt files and crawler-ingested
 * <link rel="alternate"> tags.
 */
export async function getStaticPaths() {
  const posts = await getCollection('posts');
  return posts.map((post) => ({
    params: { slug: post.id },
    props: { post },
  }));
}

type Props = { post: CollectionEntry<'posts'> };

export const GET: APIRoute<Props> = async ({ props }) => {
  return markdownResponse(await getAbsolutizedSource(props.post), props.post.id);
};
