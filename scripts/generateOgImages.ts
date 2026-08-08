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
 * Then commit the regenerated PNG(s). Titles are drawn as outlined glyph
 * paths from the site's bundled Fixel font (see `textToPaths`), never SVG
 * `<text>`, so the output is byte-identical on any machine or CI runner and
 * never depends on system fonts / fontconfig being installed.
 */

import { create as createFont } from 'fontkit';

import { mkdir, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

/**
 * Minimal frontmatter reader for the two fields this script needs —
 * gray-matter left the dependency tree with the Next.js build pipeline.
 */
function matter(source: string): { data: { title?: string; image?: string } } {
  const block = source.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
  const field = (name: string) => {
    const raw = block.match(
      new RegExp(`^${name}:[ \\t]*(.+?)[ \\t]*$`, 'm'),
    )?.[1];
    if (raw === undefined) return undefined;
    // Strip a matching pair of surrounding quotes. The previous character
    // class (`[^'"]+`) truncated YAML double-quoted titles at their first
    // inner apostrophe ("...Don't Know...") and silently dropped the post.
    const quoted = raw.match(/^(['"])([\s\S]*)\1$/);
    return quoted ? quoted[2] : raw;
  };
  return { data: { title: field('title'), image: field('image') } };
}
import sharp from 'sharp';

const WIDTH = 1200;
const HEIGHT = 630;

const ROOT = process.cwd();
const POSTS_DIR = path.join(ROOT, 'posts');
const IMAGES_DIR = path.join(ROOT, 'public', 'static', 'images');
const AVATAR_PATH = path.join(IMAGES_DIR, 'nicolas_charpentier.jpeg');
const FONTS_DIR = path.join(ROOT, 'public', 'fonts');

/**
 * The site's display font (Fixel Text), loaded once. Titles render as outlined
 * glyph paths (see `textToPaths`) instead of SVG `<text>` because librsvg only
 * resolves `<text>` through system fontconfig — absent in many CI runners and
 * not reproducible across machines. Outlining the glyphs ourselves makes every
 * card byte-identical anywhere and matches the site's own typography.
 */
async function loadFont(file) {
  return createFont(await readFile(path.join(FONTS_DIR, file)));
}
const fontExtraBold = await loadFont('FixelText-ExtraBold.woff2');
const fontSemiBold = await loadFont('FixelText-SemiBold.woff2');
const fontRegular = await loadFont('FixelText-Regular.woff2');

// Colors are taken from the homepage gradient (`GradientAnimation.module.css`):
//   blue-500   #3b82f6
//   purple-600 #9333ea
//   pink-500   #ec4899
// Matches `generateOgDefault.ts` so per-post cards feel like a family with
// the sitewide fallback.

/**
 * Render one line of text as filled glyph outlines. fontkit shapes the run
 * (kerning/ligatures); each glyph path comes back in font units with a y-up
 * baseline, so we translate it into place and flip Y (SVG points down) with a
 * negative scale. Returns the advance width too, for callers that center.
 */
function textToPaths(font, text, { x, y, fontSize, fill, letterSpacing = 0 }) {
  const scale = fontSize / font.unitsPerEm;
  const run = font.layout(text);
  let penX = 0;
  const glyphs = [];
  run.glyphs.forEach((glyph, index) => {
    const d = glyph.path.toSVG();
    if (d) {
      const gx = (x + penX).toFixed(2);
      glyphs.push(
        `<path transform="translate(${gx} ${y.toFixed(2)}) scale(${scale.toFixed(5)} ${(-scale).toFixed(5)})" d="${d}" fill="${fill}" />`,
      );
    }
    penX += run.positions[index].xAdvance * scale + letterSpacing;
  });
  return { svg: glyphs.join(''), width: penX };
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
  let fontSize = 88;
  let maxCharsPerLine = 18;
  if (title.length > 60) {
    fontSize = 64;
    maxCharsPerLine = 26;
  } else if (title.length > 40) {
    fontSize = 76;
    maxCharsPerLine = 22;
  }
  const lines = wrapTitle(title, maxCharsPerLine).slice(0, 4);
  const lineHeight = Math.round(fontSize * 1.15);

  // Vertically center the title block in the upper two-thirds of the card so
  // the avatar/byline row at the bottom has room to breathe.
  const titleBlockHeight = lines.length * lineHeight;
  const titleTop = 180 + (300 - titleBlockHeight) / 2;

  const titlePaths = lines
    .map(
      (line, index) =>
        textToPaths(fontExtraBold, line, {
          x: 80,
          y: titleTop + (index + 1) * lineHeight,
          fontSize,
          fill: '#0a0a0a',
        }).svg,
    )
    .join('');

  const eyebrow = textToPaths(fontSemiBold, 'charpeni.com', {
    x: 80,
    y: 100,
    fontSize: 28,
    fill: '#6b7280',
    letterSpacing: 2,
  }).svg;

  const bylineX = avatarCx + avatarR + 20;
  const byline =
    textToPaths(fontSemiBold, 'Nicolas Charpentier', {
      x: bylineX,
      y: avatarCy - 4,
      fontSize: 26,
      fill: '#0a0a0a',
    }).svg +
    textToPaths(fontRegular, 'Software Engineer', {
      x: bylineX,
      y: avatarCy + 26,
      fontSize: 22,
      fill: '#6b7280',
    }).svg;

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

  <!-- Eyebrow, title, and byline as outlined glyph paths (see textToPaths) -->
  ${eyebrow}
  ${titlePaths}
  ${byline}

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
