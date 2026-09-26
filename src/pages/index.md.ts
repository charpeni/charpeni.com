import { getCollection } from 'astro:content';

import { markdownResponse } from '@/utils/markdownSource';
import { SITE_URL, sortByPublishedAt } from '@/utils/postMeta';

import type { APIRoute } from 'astro';

/**
 * Markdown rendition of the homepage at /index.md — the variant
 * src/worker.ts serves for `Accept: text/markdown` requests to `/`.
 * Prerendered to a static asset; its Content-Type charset comes from
 * public/_headers (endpoint headers are lost at build). Links are absolute
 * for the same reason the post markdown is absolutized: agents read this
 * outside the origin.
 */

function formatDate(date: string): string {
  return new Date(date).toISOString().slice(0, 10);
}

export const GET: APIRoute = async () => {
  const posts = sortByPublishedAt(await getCollection('posts'));

  const postList = posts
    .map(
      (post) =>
        `- [${post.data.title}](${SITE_URL}/blog/${post.id}) (${formatDate(post.data.publishedAt)}) — [markdown](${SITE_URL}/blog/${post.id}.md)\n  ${post.data.summary}`,
    )
    .join('\n');

  const body = `# Nicolas Charpentier — Frontend Infrastructure & Developer Tooling

Personal blog of Nicolas Charpentier, a Software Engineer doing the "backend"
work of the frontend: architecture, tooling, and infrastructure. Specializes
in TypeScript, React Native, React, GraphQL, and CI/CD. Open source
enthusiast, currently working at Shortcut, on Korey.ai.

This is the markdown rendition of ${SITE_URL}/. Blog posts negotiate the same
way: request any canonical URL with \`Accept: text/markdown\`, or fetch the
\`.md\` alternates below directly.

- [llms.txt](${SITE_URL}/llms.txt) — index of every post with summaries, tags, and markdown URLs
- [llms-full.txt](${SITE_URL}/llms-full.txt) — every post in a single file
- [RSS feed](${SITE_URL}/blog/rss.xml)
- [Contact](${SITE_URL}/contact)

## Blog Posts

${postList}
`;

  return markdownResponse(body, 'index');
};
