/**
 * Generates the sitewide fallback Open Graph card
 * (`public/static/images/og-default.png`, 1200x630) used by every page that
 * has no better image of its own — the homepage, tag pages, and legal pages.
 *
 * It mirrors the terminal desktop a visitor actually lands on: the
 * `profile.txt` icon at the left, and the focused term window
 * (`ssh blog@charpeni.com 'archive agent'`) beside it. Copy comes from the
 * profile aside in src/components/desktop/DesktopShell.astro.
 *
 * Run manually after changing the card, then commit the PNG:
 *   node scripts/generateOgDefault.ts
 */

import sharp from 'sharp';

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

import {
  buildCard,
  charWidth,
  COLORS,
  mono,
  textToPaths,
} from './ogTerminalCard.ts';

const ROOT = process.cwd();
const POSTS_DIR = path.join(ROOT, 'posts');
const IMAGES_DIR = path.join(ROOT, 'public', 'static', 'images');
const AVATAR_PATH = path.join(IMAGES_DIR, 'nicolas_charpentier.jpeg');
const OUT_PATH = path.join(IMAGES_DIR, 'og-default.png');

// Desktop icon geometry, left of the window — the same arrangement the live
// desktop uses (profile icon top-left, focused window to its right).
const ICON = { cx: 150, cy: 250, size: 132 };
const WIN = { x: 268, y: 76, w: 860, h: 478 };

/**
 * The `profile.txt` desktop icon: framed avatar plus its label, matching
 * `.retro-terminal-profile-icon` in retro.css.
 */
async function profileIcon(): Promise<string> {
  const bytes = await readFile(AVATAR_PATH);
  const dataUri = `data:image/jpeg;base64,${bytes.toString('base64')}`;
  const half = ICON.size / 2;
  const x = ICON.cx - half;
  const y = ICON.cy - half;
  const labelSize = 20;
  const label = 'profile.txt';
  const labelW = charWidth(mono, labelSize) * label.length;
  const labelBoxW = labelW + 22;
  const labelBoxX = ICON.cx - labelBoxW / 2;
  const labelBoxY = y + ICON.size + 14;

  return `
  <rect x="${x - 6}" y="${y - 6}" width="${ICON.size + 12}" height="${ICON.size + 12}" fill="${COLORS.paper}" stroke="${COLORS.amber}" stroke-width="2" stroke-dasharray="5 3" />
  <clipPath id="iconClip"><rect x="${x}" y="${y}" width="${ICON.size}" height="${ICON.size}" /></clipPath>
  <image href="${dataUri}" xlink:href="${dataUri}" x="${x}" y="${y}" width="${ICON.size}" height="${ICON.size}" preserveAspectRatio="xMidYMid slice" clip-path="url(#iconClip)" />
  <rect x="${labelBoxX}" y="${labelBoxY}" width="${labelBoxW}" height="30" fill="${COLORS.amber}" />
  ${textToPaths(mono, label, {
    x: labelBoxX + 11,
    y: labelBoxY + 21,
    fontSize: labelSize,
    fill: COLORS.titlebarText,
  })}`;
}

const postCount = (await readdir(POSTS_DIR)).filter((f) =>
  f.endsWith('.mdx'),
).length;

const svg = buildCard({
  win: WIN,
  desktopExtras: await profileIcon(),
  // windowTitle parity with utils/retro.ts `windowTitle(TERM_ID)`.
  windowTitle: "ssh blog@charpeni.com 'archive agent'",
  metaLines: [
    { label: '$ ', value: 'whoami', accent: true },
  ],
  headline: 'Nicolas Charpentier',
  footLines: [
    { value: 'Staff Software Engineer' },
    { value: 'frontend infrastructure & developer tooling' },
    { value: 'TypeScript · React Native · React · GraphQL · CI/CD' },
  ],
  statusLeft: `${postCount} commits · branch main`,
  statusRight: 'charpeni.com',
});

await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(OUT_PATH);
console.log(`Generated ${path.relative(ROOT, OUT_PATH)}`);
