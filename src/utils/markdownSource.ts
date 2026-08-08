import { absolutizeMarkdownLinks } from '@/utils/absolutizeMarkdownLinks';
import { SITE_URL } from '@/utils/postMeta';

import type { CollectionEntry } from 'astro:content';

// Raw .mdx sources, bundled by Vite instead of read with node:fs so the
// prerender also works inside the Cloudflare sandbox (no filesystem there).
const RAW_POSTS = import.meta.glob('/posts/*.mdx', {
  query: '?raw',
  import: 'default',
});

/**
 * The raw .mdx source (frontmatter included) with root-relative URLs
 * rewritten to absolute — byte-compatible with what the Next.js runtime
 * route pages/api/blog/[slug].ts served, but computed once at build time.
 */
export async function getAbsolutizedSource(
  post: CollectionEntry<'posts'>,
): Promise<string> {
  const loader = RAW_POSTS[`/posts/${post.id}.mdx`];
  if (!loader) {
    throw new Error(`Post ${post.id} has no source file`);
  }
  const raw = (await loader()) as string;
  return absolutizeMarkdownLinks(raw, SITE_URL);
}

export function markdownResponse(body: string, slug: string): Response {
  return new Response(body, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `inline; filename="${slug}.md"`,
    },
  });
}
