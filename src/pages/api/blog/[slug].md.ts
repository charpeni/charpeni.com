import { getCollection } from 'astro:content';

import {
  getAbsolutizedSource,
  markdownResponse,
} from '@/utils/markdownSource';

import type { APIRoute } from 'astro';
import type { CollectionEntry } from 'astro:content';

/**
 * Permanent legacy alias for /blog/[slug].md. The absolute URL
 * https://charpeni.com/api/blog/{slug}.md is embedded in previously
 * published llms.txt files and has been ingested by AI crawlers from
 * <link rel="alternate" type="text/markdown"> — it must keep returning 200
 * with identical content indefinitely (a redirect would churn LLM caches
 * and add a hop for agents that don't follow redirects).
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
