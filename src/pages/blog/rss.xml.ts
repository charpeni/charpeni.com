import { getCollection } from 'astro:content';

import { getImageMeta, SITE_URL, sortByPublishedAt } from '@/utils/postMeta';

import type { APIRoute } from 'astro';
import type { CollectionEntry } from 'astro:content';

/**
 * Prerendered port of scripts/generateRssFeed.mts — identical XML shape
 * (enclosure with byte length, atom:updated, dc:creator, per-tag category,
 * sy: namespace, lastBuildDate from the newest post), generated from the
 * content collection instead of a post-build script writing into public/.
 * Enclosure sizes come from the config-time imageMeta map — node:fs is
 * unavailable in the Cloudflare prerender sandbox.
 */

const AUTHOR_NAME = 'Nicolas Charpentier';
const AUTHOR_EMAIL = 'blog@nicolascharpentier.com';

type Post = CollectionEntry<'posts'>;

function escapeXml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function generateRssItem(post: Post): string {
  const { title, publishedAt, updatedAt, summary, image, tags } = post.data;
  const postUrl = `${SITE_URL}/blog/${post.id}`;
  const pubDate = new Date(publishedAt).toUTCString();
  // Banner is optional. When absent, we omit `<enclosure>` from the item;
  // feed readers gracefully render the item without a thumbnail.
  let enclosure = '';
  const meta = image ? getImageMeta(image) : undefined;
  if (image && meta) {
    const imageUrl = `${SITE_URL}${image}`;
    enclosure = `\n      <enclosure url="${escapeXml(imageUrl)}" length="${meta.size}" type="${meta.mimeType}" />`;
  }

  // RSS 2.0 has no native "modified" date, so we use the Atom namespace's
  // <atom:updated> element when an explicit `updatedAt` is set. Feed readers
  // that respect Atom (most modern ones do) will render this as a freshness
  // signal alongside the original <pubDate>.
  const atomUpdated = updatedAt
    ? `\n      <atom:updated>${new Date(updatedAt).toISOString()}</atom:updated>`
    : '';

  // <category> appears once per tag. Feed readers (Feedly, NetNewsWire) use
  // these for filtering and search.
  const categories = tags
    .map((tag) => `\n      <category>${escapeXml(tag)}</category>`)
    .join('');

  return `    <item>
      <title>${escapeXml(title)}</title>
      <link>${postUrl}</link>
      <guid>${postUrl}</guid>
      <pubDate>${pubDate}</pubDate>${atomUpdated}
      <dc:creator>${escapeXml(AUTHOR_NAME)}</dc:creator>${categories}
      <description>${escapeXml(summary)}</description>${enclosure}
    </item>`;
}

function generateRssFeed(posts: Post[]): string {
  // Use the most recent post's date as the channel's lastBuildDate so feed
  // readers don't think the feed updates on every deploy.
  const mostRecent = posts.at(0);
  const lastBuildDate = mostRecent
    ? new Date(
        mostRecent.data.updatedAt ?? mostRecent.data.publishedAt,
      ).toUTCString()
    : new Date().toUTCString();

  const items = posts.map((post) => generateRssItem(post)).join('\n');

  // Namespaces:
  //   atom: <atom:link>, <atom:updated>
  //   dc:   <dc:creator>
  //   sy:   <sy:updatePeriod>, <sy:updateFrequency> (publishing cadence hint)
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:sy="http://purl.org/rss/1.0/modules/syndication/">
  <channel>
    <title>Nicolas Charpentier's Blog</title>
    <link>${SITE_URL}</link>
    <description>Personal blog of Nicolas Charpentier, a Software Engineer specializing in React Native, React, GraphQL, and Continuous Integration.</description>
    <language>en</language>
    <copyright>Copyright ${new Date().getFullYear()} ${escapeXml(AUTHOR_NAME)}</copyright>
    <managingEditor>${AUTHOR_EMAIL} (${escapeXml(AUTHOR_NAME)})</managingEditor>
    <webMaster>${AUTHOR_EMAIL} (${escapeXml(AUTHOR_NAME)})</webMaster>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <sy:updatePeriod>monthly</sy:updatePeriod>
    <sy:updateFrequency>1</sy:updateFrequency>
    <atom:link href="${SITE_URL}/blog/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;
}

export const GET: APIRoute = async () => {
  const posts = sortByPublishedAt(await getCollection('posts'));
  return new Response(generateRssFeed(posts), {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  });
};
