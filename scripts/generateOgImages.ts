/**
 * Generates per-post Open Graph fallback images for blog posts that don't
 * ship a custom banner.
 *
 * For every `posts/<slug>.mdx` whose front matter omits `image`, this script
 * writes `/public/static/images/<slug>/og.png` (1200x630), which
 * `getOgImagePath` picks up as the OG/Twitter image for that post.
 *
 * The card mirrors the terminal desktop — the site's default presentation —
 * as the `git show` window that post opens in, down to the commit/Author/Date
 * block and the short hash. See scripts/ogTerminalCard.ts for the renderer.
 *
 * Run manually after adding or renaming a post:
 *   node scripts/generateOgImages.ts
 *
 * Then commit the regenerated PNG(s).
 */

import readingTime from 'reading-time';
import sharp from 'sharp';

import { mkdir, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

import { shortHash } from '../src/utils/graph.ts';
import { buildCard } from './ogTerminalCard.ts';

/**
 * Minimal frontmatter reader for the fields this script needs — gray-matter
 * left the dependency tree with the Next.js build pipeline.
 */
function matter(source: string): {
  data: {
    title?: string;
    image?: string;
    publishedAt?: string;
    tags?: string[];
  };
  body: string;
} {
  const match = source.match(/^---\n([\s\S]*?)\n---([\s\S]*)$/);
  const block = match?.[1] ?? '';
  const body = match?.[2] ?? source;
  const field = (name: string) => {
    const raw = block.match(
      new RegExp(`^${name}:[ \\t]*(.+?)[ \\t]*$`, 'm'),
    )?.[1];
    if (raw === undefined) return undefined;
    // Strip a matching pair of surrounding quotes. A naive `[^'"]+` class
    // truncated YAML double-quoted titles at their first inner apostrophe
    // ("...Don't Know...") and silently dropped the post.
    const quoted = raw.match(/^(['"])([\s\S]*)\1$/);
    return quoted ? quoted[2] : raw;
  };
  const rawTags = field('tags');
  const tags = rawTags
    ?.replace(/^\[|\]$/g, '')
    .split(',')
    .map((t) => t.trim().replace(/^(['"])(.*)\1$/, '$2'))
    .filter(Boolean);
  return {
    data: {
      title: field('title'),
      image: field('image'),
      publishedAt: field('publishedAt'),
      tags,
    },
    body,
  };
}

/** `formatLongDate` parity (date-fns 'MMMM dd, yyyy') without the dependency. */
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
function formatLongDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${MONTHS[d.getUTCMonth()]} ${String(d.getUTCDate()).padStart(2, '0')}, ${d.getUTCFullYear()}`;
}

const ROOT = process.cwd();
const POSTS_DIR = path.join(ROOT, 'posts');
const IMAGES_DIR = path.join(ROOT, 'public', 'static', 'images');

// Mirrors utils/retro.ts — branch tags name a thread, the rest are topics.
const BRANCH_TAGS = new Set([
  'graphql',
  'homelab',
  'react-native',
  'typescript',
  'javascript',
  'react',
  'tooling',
]);

async function generateForPost(
  slug: string,
  data: { title: string; publishedAt?: string; tags?: string[] },
  body: string,
): Promise<void> {
  const outDir = path.join(IMAGES_DIR, slug);
  const outPath = path.join(outDir, 'og.png');
  const hash = shortHash(slug);
  const stats = readingTime(body);
  const branch = data.tags?.find((t) => BRANCH_TAGS.has(t));

  const metaLines: { label?: string; value: string; accent?: boolean }[] = [
    { label: 'commit ', value: hash, accent: true },
    { label: 'Author: ', value: 'Nicolas Charpentier <blog@nicolascharpentier.com>' },
  ];
  if (data.publishedAt) {
    metaLines.push({ label: 'Date:   ', value: formatLongDate(data.publishedAt) });
  }
  metaLines.push({ label: 'Size:   ', value: stats.text });

  const svg = buildCard({
    windowTitle: `git show ${hash} — ${data.title}`,
    metaLines,
    headline: data.title,
    statusLeft: branch ? `branch ${branch}` : 'branch main',
    statusRight: 'charpeni.com',
  });

  await mkdir(outDir, { recursive: true });
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(outPath);
  console.log(`Generated ${path.relative(ROOT, outPath)}`);
}

const files = await readdir(POSTS_DIR);
const mdxFiles = files.filter((file) => file.endsWith('.mdx'));

let generated = 0;
let skipped = 0;

for (const file of mdxFiles) {
  const slug = file.replace(/\.mdx$/, '');
  const source = await readFile(path.join(POSTS_DIR, file), 'utf8');
  const { data, body } = matter(source);

  // Posts that ship a banner already have a stronger social preview than we
  // can synthesize here — the layout uses their banner directly.
  if (data.image) {
    skipped += 1;
    continue;
  }
  if (!data.title) {
    console.warn(`Skipping ${file}: missing title in front matter`);
    skipped += 1;
    continue;
  }

  await generateForPost(slug, { ...data, title: data.title }, body);
  generated += 1;
}

console.log(
  `\nGenerated ${generated} OG image(s), skipped ${skipped} (banner present or missing title).`,
);
