import { getCollection } from 'astro:content';

import { getAbsolutizedSource } from '@/utils/markdownSource';
import { SITE_URL, sortByPublishedAt } from '@/utils/postMeta';

import type { APIRoute } from 'astro';

/**
 * llms-full.txt — every post's full markdown source (frontmatter included,
 * links absolutized) concatenated into one file, newest first. The Next.js
 * site did not have this; it follows the llms.txt convention's
 * companion-file pattern so an LLM can ingest the whole blog in one fetch.
 */
export const GET: APIRoute = async () => {
  const posts = sortByPublishedAt(await getCollection('posts'));

  const header = `# Nicolas Charpentier's Blog — Full Content

> Personal blog of Nicolas Charpentier, a Software Engineer specializing in React Native, React, GraphQL, and Continuous Integration. This file contains the complete markdown source of every post, newest first. Per-post metadata and URLs: ${SITE_URL}/llms.txt

`;

  const sources = await Promise.all(
    posts.map((post) => getAbsolutizedSource(post)),
  );
  const body = sources.map((source) => source.trim()).join('\n\n---\n\n');

  return new Response(`${header}${body}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
