import { computeGraph } from '@/utils/graph';
import { getReadingStats, sortByPublishedAt } from '@/utils/postMeta';

import type { TermPost } from '@/utils/retro';
import type { CollectionEntry } from 'astro:content';

/**
 * The reader homepage's paginated card model, shared by the homepage (which
 * server-renders page 1 only) and the /partials/home-posts/[page] fragments
 * (which serve the rest on demand). Serving every page inline cost ~750ms of
 * homepage FCP: 28 hidden cards plus their graph SVG were 61% of the DOM,
 * parsed and style-resolved before first paint despite never rendering.
 *
 * Each page's graph is computed from its slice against the FULL archive, so
 * branch lanes exit the top/bottom edges when a branch continues onto another
 * page — that contract is unchanged by where the page's HTML comes from.
 */
export const POSTS_PER_PAGE = 8;

export function buildHomePages(posts: CollectionEntry<'posts'>[]) {
  const all = sortByPublishedAt(posts);

  const termPosts: TermPost[] = all.map((p) => ({
    slug: p.id,
    title: p.data.title,
    publishedAt: p.data.publishedAt,
    tags: p.data.tags,
    readingTimeText: getReadingStats(p.body ?? '').readingTime.text,
    image: p.data.image,
  }));

  const cards = termPosts.map((p) => ({
    slug: p.slug,
    title: p.title,
    summary: all.find((a) => a.id === p.slug)!.data.summary,
    publishedAt: p.publishedAt,
    tags: p.tags,
    readingTimeText: p.readingTimeText,
  }));

  const totalPages = Math.max(1, Math.ceil(cards.length / POSTS_PER_PAGE));
  const pages = Array.from({ length: totalPages }, (_, i) => {
    const slice = cards.slice(i * POSTS_PER_PAGE, (i + 1) * POSTS_PER_PAGE);
    return { page: i + 1, slice, graph: computeGraph(slice, cards) };
  });

  return { termPosts, cards, pages, totalPages };
}
