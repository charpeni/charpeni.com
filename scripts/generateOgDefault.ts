/**
 * Generates `/public/static/images/og-default.png` (1200x630), the fallback
 * Open Graph / Twitter card image used on every page that doesn't override
 * the `image` prop on `<Container>` (homepage, /disclaimer, /privacy-policy).
 *
 * Run manually after editing the SVG below:
 *   node scripts/generateOgDefault.ts
 *
 * Then commit the regenerated PNG.
 *
 * Text is drawn as outlined glyph paths from the site's bundled Fixel font
 * (see `textToPaths`), never SVG `<text>`, so the output is byte-identical on
 * any machine or CI runner and never depends on system fonts / fontconfig.
 */

import { create as createFont } from 'fontkit';

import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import sharp from 'sharp';

const WIDTH = 1200;
const HEIGHT = 630;

const ROOT = process.cwd();
const OUT_PATH = path.join(
  ROOT,
  'public',
  'static',
  'images',
  'og-default.png',
);
const AVATAR_PATH = path.join(
  ROOT,
  'public',
  'static',
  'images',
  'nicolas_charpentier.jpeg',
);
const FONTS_DIR = path.join(ROOT, 'public', 'fonts');

/**
 * The site's display font (Fixel Text), loaded once. Text renders as outlined
 * glyph paths (see `textToPaths`) instead of SVG `<text>` because librsvg only
 * resolves `<text>` through system fontconfig — absent in many CI runners and
 * not reproducible across machines. Outlining the glyphs ourselves makes the
 * card byte-identical anywhere and matches the site's own typography.
 */
async function loadFont(file) {
  return createFont(await readFile(path.join(FONTS_DIR, file)));
}
const fontExtraBold = await loadFont('FixelText-ExtraBold.woff2');
const fontSemiBold = await loadFont('FixelText-SemiBold.woff2');
const fontRegular = await loadFont('FixelText-Regular.woff2');

/**
 * Render one line of text as filled glyph outlines. fontkit shapes the run
 * (kerning/ligatures); each glyph path comes back in font units with a y-up
 * baseline, so we translate it into place and flip Y (SVG points down) with a
 * negative scale.
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
  return glyphs.join('');
}

// Colors are taken from the homepage gradient (`GradientAnimation.module.css`):
//   blue-500   #3b82f6
//   purple-600 #9333ea
//   pink-500   #ec4899
// We render at full opacity here for crisper social previews; the live site
// uses 0.7 alpha plus a blur for the rotating animated effect.

async function buildSvg(): Promise<string> {
  // Embed the avatar as a base64 data URI so the SVG renders without needing
  // to resolve external file paths through librsvg.
  const avatarBytes = await readFile(AVATAR_PATH);
  const avatarDataUri = `data:image/jpeg;base64,${avatarBytes.toString('base64')}`;

  const avatarSize = 260;
  const avatarCx = 1000;
  const avatarCy = HEIGHT / 2;
  const avatarR = avatarSize / 2;
  const ringWidth = 8;

  const textBlock =
    textToPaths(fontSemiBold, 'charpeni.com', {
      x: 80,
      y: 220,
      fontSize: 38,
      fill: '#6b7280',
      letterSpacing: 2,
    }) +
    textToPaths(fontExtraBold, 'Nicolas Charpentier', {
      x: 80,
      y: 330,
      fontSize: 72,
      fill: '#0a0a0a',
    }) +
    textToPaths(fontRegular, 'Software Engineer', {
      x: 80,
      y: 400,
      fontSize: 32,
      fill: '#374151',
    }) +
    textToPaths(fontRegular, 'Frontend infrastructure & tooling', {
      x: 120,
      y: 445,
      fontSize: 28,
      fill: '#6b7280',
    });

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

  <!-- Name, role, and tagline as outlined glyph paths (see textToPaths) -->
  ${textBlock}

  <!-- Avatar: gradient ring + clipped photo -->
  <circle cx="${avatarCx}" cy="${avatarCy}" r="${avatarR + ringWidth}" fill="url(#accent)" />
  <circle cx="${avatarCx}" cy="${avatarCy}" r="${avatarR + 2}" fill="#ffffff" />
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

await mkdir(path.dirname(OUT_PATH), { recursive: true });

const svg = await buildSvg();
await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(OUT_PATH);

console.log(`Generated ${path.relative(ROOT, OUT_PATH)} (${WIDTH}x${HEIGHT})`);
