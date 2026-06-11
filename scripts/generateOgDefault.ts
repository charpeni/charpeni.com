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
 * The PNG is committed to the repo so the build pipeline never has to
 * rasterize text — this avoids font-rendering differences between local
 * macOS and the Linux build environment.
 */

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

  <!-- Text -->
  <g font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif">
    <text x="80" y="220" font-size="38" font-weight="600" fill="#6b7280" letter-spacing="2">
      charpeni.com
    </text>
    <text x="80" y="330" font-size="72" font-weight="800" fill="#0a0a0a">
      Nicolas Charpentier
    </text>
    <text x="80" y="400" font-size="32" font-weight="500" fill="#374151">
      Software Engineer
    </text>
    <text x="120" y="445" font-size="28" font-weight="500" fill="#6b7280">
      Frontend infrastructure &amp; tooling
    </text>
  </g>

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
