/**
 * Generates per-post Open Graph fallback images for blog posts that don't
 * ship a custom banner.
 *
 * For every `posts/<slug>.mdx` whose front matter omits `image`, this script
 * writes `/public/static/images/<slug>/og.png` (1200x630). `BlogLayout` picks
 * it up automatically as the OG/Twitter image for that post (see
 * `components/BlogLayout.tsx`), so social previews advertise the actual
 * article title instead of the generic sitewide card.
 *
 * Run manually after adding or renaming a post:
 *   node scripts/generateOgImages.ts
 *
 * Then commit the regenerated PNG(s). Like `og-default.png`, these are
 * committed to the repo so the build pipeline never has to rasterize text —
 * this avoids font-rendering differences between local macOS and the Linux
 * build environment.
 */

import { mkdir, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

import matter from 'gray-matter';
import sharp from 'sharp';

const WIDTH = 1200;
const HEIGHT = 630;

const ROOT = process.cwd();
const POSTS_DIR = path.join(ROOT, 'posts');
const IMAGES_DIR = path.join(ROOT, 'public', 'static', 'images');
const AVATAR_PATH = path.join(IMAGES_DIR, 'nicolas_charpentier.jpeg');

// Colors are taken from the homepage gradient (`GradientAnimation.module.css`):
//   blue-500   #3b82f6
//   purple-600 #9333ea
//   pink-500   #ec4899
// Matches `generateOgDefault.ts` so per-post cards feel like a family with
// the sitewide fallback.

/**
 * Escape characters that have meaning in XML so titles with quotes, ampersands,
 * or angle brackets don't break the SVG.
 */
function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

/**
 * Greedy word-wrap for SVG `<text>`, which doesn't wrap on its own. We size
 * lines by approximate character count rather than measuring glyphs — the
 * SVG is rasterized headlessly so we can't query a real font metrics API,
 * and rough wrapping is good enough for OG cards.
 */
function wrapTitle(title: string, maxCharsPerLine: number): string[] {
  const words = title.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxCharsPerLine) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);

  return lines;
}

async function buildSvg(title: string): Promise<string> {
  // Embed the avatar as a base64 data URI so the SVG renders without needing
  // to resolve external file paths through librsvg.
  const avatarBytes = await readFile(AVATAR_PATH);
  const avatarDataUri = `data:image/jpeg;base64,${avatarBytes.toString('base64')}`;

  const avatarSize = 64;
  const avatarCx = 80 + avatarSize / 2;
  const avatarCy = HEIGHT - 80;
  const avatarR = avatarSize / 2;
  const ringWidth = 3;

  // Title wrapping. We pick a font size based on overall length so short,
  // punchy titles get a bigger treatment and long ones stay readable.
  const fontSize = title.length > 60 ? 64 : (title.length > 40 ? 76 : 88);
  const maxCharsPerLine =
    title.length > 60 ? 26 : (title.length > 40 ? 22 : 18);
  const lines = wrapTitle(title, maxCharsPerLine).slice(0, 4);
  const lineHeight = Math.round(fontSize * 1.15);

  // Vertically center the title block in the upper two-thirds of the card so
  // the avatar/byline row at the bottom has room to breathe.
  const titleBlockHeight = lines.length * lineHeight;
  const titleTop = 180 + (300 - titleBlockHeight) / 2;

  const titleTspans = lines
    .map(
      (line, index) =>
        `<tspan x="80" y="${titleTop + (index + 1) * lineHeight}">${escapeXml(line)}</tspan>`,
    )
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#3b82f6" />
      <stop offset="50%" stop-color="#9333ea" />
      <stop offset="100%" stop-color="#ec4899" />
    </linearGradient>
    <linearGradient id="accentSoft" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.08" />
      <stop offset="50%" stop-color="#9333ea" stop-opacity="0.06" />
      <stop offset="100%" stop-color="#ec4899" stop-opacity="0.08" />
    </linearGradient>
    <radialGradient id="glowBlue" cx="0%" cy="0%" r="60%">
      <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.18" />
      <stop offset="100%" stop-color="#3b82f6" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="glowPink" cx="100%" cy="100%" r="60%">
      <stop offset="0%" stop-color="#ec4899" stop-opacity="0.18" />
      <stop offset="100%" stop-color="#ec4899" stop-opacity="0" />
    </radialGradient>
    <clipPath id="avatarClip">
      <circle cx="${avatarCx}" cy="${avatarCy}" r="${avatarR}" />
    </clipPath>
  </defs>

  <!-- Background -->
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#ffffff" />
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#accentSoft)" />
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glowBlue)" />
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glowPink)" />

  <!-- Accent bar -->
  <rect x="80" y="120" width="80" height="6" rx="3" fill="url(#accent)" />

  <g font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif">
    <!-- Eyebrow -->
    <text x="80" y="100" font-size="28" font-weight="600" fill="#6b7280" letter-spacing="2">
      charpeni.com
    </text>

    <!-- Title -->
    <text font-size="${fontSize}" font-weight="800" fill="#0a0a0a">
      ${titleTspans}
    </text>

    <!-- Byline -->
    <text x="${avatarCx + avatarR + 20}" y="${avatarCy - 4}" font-size="26" font-weight="600" fill="#0a0a0a">
      Nicolas Charpentier
    </text>
    <text x="${avatarCx + avatarR + 20}" y="${avatarCy + 26}" font-size="22" font-weight="500" fill="#6b7280">
      Software Engineer
    </text>
  </g>

  <!-- Avatar: gradient ring + clipped photo -->
  <circle cx="${avatarCx}" cy="${avatarCy}" r="${avatarR + ringWidth}" fill="url(#accent)" />
  <circle cx="${avatarCx}" cy="${avatarCy}" r="${avatarR + 1}" fill="#ffffff" />
  <image
    href="${avatarDataUri}"
    xlink:href="${avatarDataUri}"
    x="${avatarCx - avatarR}"
    y="${avatarCy - avatarR}"
    width="${avatarSize}"
    height="${avatarSize}"
    preserveAspectRatio="xMidYMid slice"
    clip-path="url(#avatarClip)"
  />
</svg>`;
}

async function generateForPost(slug: string, title: string): Promise<void> {
  const outDir = path.join(IMAGES_DIR, slug);
  const outPath = path.join(outDir, 'og.png');

  await mkdir(outDir, { recursive: true });
  const svg = await buildSvg(title);
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
  const { data } = matter(source);

  // Posts that ship a banner already have a stronger social preview than we
  // can synthesize here — let `BlogLayout` use their banner directly.
  if (data.image) {
    skipped += 1;
    continue;
  }

  if (!data.title) {
    console.warn(`Skipping ${file}: missing title in front matter`);
    skipped += 1;
    continue;
  }

  await generateForPost(slug, data.title);
  generated += 1;
}

console.log(
  `\nGenerated ${generated} OG image(s), skipped ${skipped} (banner present or missing title).`,
);
