import fs from 'node:fs';
import path from 'node:path';

import matter from 'gray-matter';

import type { PostMeta as CanonicalPostMeta } from '../utils/mdx';

const SITE_URL = 'https://charpeni.com';
const AUTHOR_NAME = 'Nicolas Charpentier';
const AUTHOR_EMAIL = 'blog@nicolascharpentier.com';

const MIME_TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
} as const;

/**
 * The fields this script reads from a post's front matter. Derived from the
 * canonical {@link CanonicalPostMeta} so the RSS shape can't drift from the
 * source of truth in `utils/mdx.ts`. `image` is optional: when omitted, the
 * RSS `<enclosure>` is skipped and readers render the item without a thumbnail.
 */
type PostMeta = Pick<
  CanonicalPostMeta,
  'slug' | 'title' | 'publishedAt' | 'updatedAt' | 'summary' | 'image' | 'tags'
>;

function escapeXml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function getPostsMeta(): PostMeta[] {
  const postsDir = path.join(process.cwd(), 'posts');
  const files = fs.readdirSync(postsDir).filter((f) => f.endsWith('.mdx'));

  return files
    .map((file) => {
      const slug = file.replace(/\.mdx$/, '');
      const content = fs.readFileSync(path.join(postsDir, file), 'utf8');
      const { data } = matter(content);

      const meta: PostMeta = {
        slug,
        title: data.title as string,
        publishedAt: data.publishedAt as string,
        summary: data.summary as string,
        tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
      };
      if (data.image) {
        meta.image = data.image as string;
      }
      if (data.updatedAt) {
        meta.updatedAt = data.updatedAt as string;
      }
      return meta;
    })
    .toSorted(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );
}

function generateRssItem(post: PostMeta): string {
  const postUrl = `${SITE_URL}/blog/${post.slug}`;
  const pubDate = new Date(post.publishedAt).toUTCString();
  // Banner is optional. When absent, we omit `<enclosure>` from the item;
  // feed readers gracefully render the item without a thumbnail.
  let enclosure = '';
  if (post.image) {
    const imageUrl = `${SITE_URL}${post.image}`;
    const imagePath = path.join(process.cwd(), 'public', post.image);
    const imageSize = fs.statSync(imagePath).size;
    const ext = path.extname(post.image).toLowerCase();
    const mimeType =
      MIME_TYPES[ext as keyof typeof MIME_TYPES] ?? 'application/octet-stream';
    enclosure = `\n      <enclosure url="${escapeXml(imageUrl)}" length="${imageSize}" type="${mimeType}" />`;
  }

  // RSS 2.0 has no native "modified" date, so we use the Atom namespace's
  // <atom:updated> element when an explicit `updatedAt` is set. Feed readers
  // that respect Atom (most modern ones do) will render this as a freshness
  // signal alongside the original <pubDate>.
  const atomUpdated = post.updatedAt
    ? `\n      <atom:updated>${new Date(post.updatedAt).toISOString()}</atom:updated>`
    : '';

  // <category> appears once per tag. Feed readers (Feedly, NetNewsWire) use
  // these for filtering and search.
  const categories = post.tags
    .map((tag) => `\n      <category>${escapeXml(tag)}</category>`)
    .join('');

  return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${postUrl}</link>
      <guid>${postUrl}</guid>
      <pubDate>${pubDate}</pubDate>${atomUpdated}
      <dc:creator>${escapeXml(AUTHOR_NAME)}</dc:creator>${categories}
      <description>${escapeXml(post.summary)}</description>${enclosure}
    </item>`;
}

function generateRssFeed(posts: PostMeta[]): string {
  // Use the most recent post's date as the channel's lastBuildDate so feed
  // readers don't think the feed updates on every deploy.
  const mostRecent = posts.at(0);
  const lastBuildDate = mostRecent
    ? new Date(mostRecent.updatedAt ?? mostRecent.publishedAt).toUTCString()
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

function main() {
  console.log('Generating RSS feed...');

  const posts = getPostsMeta();
  const feed = generateRssFeed(posts);

  const outputDir = path.join(process.cwd(), 'public', 'blog');
  fs.mkdirSync(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, 'rss.xml');
  fs.writeFileSync(outputPath, feed);

  console.log(`Generated blog/rss.xml with ${posts.length} posts`);
}

main();
