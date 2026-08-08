import { getCollection } from 'astro:content';

import {
  getAbsolutizedSource,
  markdownResponse,
} from '@/utils/markdownSource';

import type { APIRoute } from 'astro';
import type { CollectionEntry } from 'astro:content';

/**
 * Extensionless legacy alias — the old Next.js route pages/api/blog/[slug].ts
 * stripped an optional `.md`, so /api/blog/{slug} (no extension) also
 * returned the markdown source. Kept for parity with any published links.
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
