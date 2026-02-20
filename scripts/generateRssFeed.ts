import fs from 'node:fs';
import path from 'node:path';

import matter from 'gray-matter';

const SITE_URL = 'https://charpeni.com';

const MIME_TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
} as const;

type PostMeta = {
  slug: string;
  title: string;
  publishedAt: string;
  summary: string;
  image: string;
};

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

      return {
        slug,
        title: data.title as string,
        publishedAt: data.publishedAt as string,
        summary: data.summary as string,
        image: data.image as string,
      };
    })
    .toSorted(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );
}

function generateRssItem(post: PostMeta): string {
  const postUrl = `${SITE_URL}/blog/${post.slug}`;
  const pubDate = new Date(post.publishedAt).toUTCString();
  const imageUrl = `${SITE_URL}${post.image}`;
  const imagePath = path.join(process.cwd(), 'public', post.image);
  const imageSize = fs.statSync(imagePath).size;
  const ext = path.extname(post.image).toLowerCase();
  const mimeType = MIME_TYPES[ext] ?? 'application/octet-stream';

  return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${postUrl}</link>
      <guid>${postUrl}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(post.summary)}</description>
      <enclosure url="${escapeXml(imageUrl)}" length="${imageSize}" type="${mimeType}" />
    </item>`;
}

function generateRssFeed(posts: PostMeta[]): string {
  const lastBuildDate = new Date().toUTCString();
  const items = posts.map((post) => generateRssItem(post)).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Nicolas Charpentier's Blog</title>
    <link>${SITE_URL}</link>
    <description>Personal blog of Nicolas Charpentier, a Software Engineer specializing in React Native, React, GraphQL, and Continuous Integration.</description>
    <language>en</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
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
