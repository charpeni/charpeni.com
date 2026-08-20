import { getCollection } from 'astro:content';

import { SITE_URL, sortByPublishedAt } from '@/utils/postMeta';

import type { APIRoute } from 'astro';
import type { CollectionEntry } from 'astro:content';

/**
 * Prerendered port of scripts/generateLlmsTxt.mts. In the Next.js build this
 * was a post-build script writing into public/; here it is a static endpoint
 * generated from the content collection — no separate build step, and it can
 * never drift from the posts that were built.
 *
 * The canonical Markdown URL moves to /blog/{slug}.md; the legacy
 * /api/blog/{slug}.md URLs remain live for previously published copies.
 */

function formatDate(date: string): string {
  return new Date(date).toISOString().slice(0, 10);
}

function formatTags(tags: string[]): string {
  return tags.length > 0 ? tags.map((tag) => `\`${tag}\``).join(', ') : 'none';
}

function stripTrailingPunctuation(text: string): string {
  return text.replace(/[.!?]+$/, '');
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  const slice = text.slice(0, maxLength - 3).trimEnd();
  const lastSpace = slice.lastIndexOf(' ');
  const boundary = lastSpace > maxLength * 0.6 ? lastSpace : slice.length;
  return `${slice.slice(0, boundary)}...`;
}

function formatBestCitedFor(post: CollectionEntry<'posts'>): string {
  const { tags, summary } = post.data;
  const topicPrefix = tags.length > 0 ? `${formatTags(tags)} - ` : '';
  const truncated = truncate(stripTrailingPunctuation(summary), 160);
  return `${topicPrefix}${truncated}${truncated.endsWith('...') ? '' : '.'}`;
}

export function generateLlmsTxt(posts: CollectionEntry<'posts'>[]): string {
  const postLinks = posts
    .map((post) => {
      const htmlUrl = `${SITE_URL}/blog/${post.id}`;
      const markdownUrl = `${SITE_URL}/blog/${post.id}.md`;

      return `### ${post.data.title}

- Canonical URL: ${htmlUrl}
- Markdown URL: ${markdownUrl}
- Published: ${formatDate(post.data.publishedAt)}
- Tags: ${formatTags(post.data.tags)}
- Summary: ${post.data.summary}
- Best cited for: ${formatBestCitedFor(post)}`;
    })
    .join('\n\n');

  return `# Nicolas Charpentier's Blog

> Personal blog of Nicolas Charpentier, a Software Engineer specializing in React Native, React, GraphQL, and Continuous Integration. Open source enthusiast focused on frontend architecture, infrastructure, and improving developer experience.

## About

Nicolas Charpentier is a Software Engineer who describes himself as someone doing the "backend" work of the frontend: frontend architecture and infrastructure. Currently working at Shortcut.

## Blog Posts

All blog posts are available in markdown format at \`/blog/{slug}.md\`. A single-file concatenation of every post is available at \`/llms-full.txt\`.

${postLinks}

## Topics Covered

- TypeScript (type testing, generics, autocomplete with open-ended unions, typing Object.keys/Object.entries, ReadonlyArray includes)
- React and React Native (library setup, integration patterns, useTransition pitfalls)
- GraphQL and Apollo Client (interface-based type policies, enum pitfalls, UI flickering with previousData)
- Continuous Integration and DevOps (ESLint speed on CI, reliable JavaScript CI, Angular CLI CI, Bun code coverage gap)
- Developer tooling (Betterer for incremental best practices, Graphite for stacked PRs, custom Git merge drivers, git bisect)
- Testing (reproducing flaky Playwright tests)
- Dependency security (CVE resolution, minimum release age, compromised packages)
- JavaScript language features (ES8, default parameters, Array.prototype.groupBy)
- Homelab and self-hosting

## Contact

- Website: ${SITE_URL}
- GitHub: https://github.com/charpeni
- LinkedIn: https://www.linkedin.com/in/nicolas-charpentier-8a2b8a104/
- Twitter/X: https://x.com/charpeni_
- Bluesky: https://bsky.app/profile/charpeni.bsky.social
- Email: blog@nicolascharpentier.com
`;
}

export const GET: APIRoute = async () => {
  const posts = sortByPublishedAt(await getCollection('posts'));
  return new Response(generateLlmsTxt(posts), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
