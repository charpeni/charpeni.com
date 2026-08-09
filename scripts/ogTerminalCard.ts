/**
 * Shared renderer for the retro-terminal Open Graph cards.
 *
 * The terminal desktop is the site's default presentation, so social previews
 * render the same thing a visitor lands on: a `git show` window on the cream
 * dotted desktop. Colors and geometry are lifted from src/styles/retro.css —
 * `.retro-terminal-desktop` (#f4ecd8 + #d4c9a8 dots on a 24px grid),
 * `.retro-terminal-titlebar--active` (#b45309 on #f4ecd8), and the window
 * body's #fffaf0 — so the card and the live UI can't drift apart silently.
 *
 * Type is JetBrains Mono, subset to the glyphs these cards use and vendored
 * under scripts/fonts (build-time only — never served to browsers). The site's
 * own monospace stack names it, so the card matches what many visitors see.
 * Text is emitted as outlined glyph paths rather than SVG `<text>`: librsvg
 * only resolves `<text>` through system fontconfig, which is absent on many CI
 * runners, so outlining keeps every card byte-identical on any machine.
 */

import { create as createFont } from 'fontkit';

import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const WIDTH = 1200;
export const HEIGHT = 630;

const ROOT = process.cwd();
const FONTS_DIR = path.join(ROOT, 'scripts', 'fonts');

// retro.css palette.
export const COLORS = {
  desktop: '#f4ecd8',
  dot: '#d4c9a8',
  ink: '#2a2a2a',
  amber: '#b45309',
  amberDeep: '#9a4f00',
  paper: '#fffaf0',
  border: '#d4c9a8',
  muted: '#7a7160',
  mutedDeep: '#5a5345',
  titlebarText: '#f4ecd8',
};

async function loadFont(file: string) {
  return createFont(await readFile(path.join(FONTS_DIR, file)));
}
export const mono = await loadFont('JetBrainsMono-Regular.woff2');
export const monoBold = await loadFont('JetBrainsMono-Bold.woff2');

/**
 * Render one run of text as filled glyph outlines. fontkit shapes the run and
 * returns each glyph's path in font units on a y-up baseline, so we translate
 * into place and flip Y (SVG points down) with a negative scale.
 */
export function textToPaths(
  font: ReturnType<typeof createFont>,
  text: string,
  {
    x,
    y,
    fontSize,
    fill,
    opacity,
  }: {
    x: number;
    y: number;
    fontSize: number;
    fill: string;
    opacity?: number;
  },
): string {
  const scale = fontSize / font.unitsPerEm;
  const run = font.layout(text);
  let penX = 0;
  const glyphs: string[] = [];
  run.glyphs.forEach((glyph, index) => {
    const d = glyph.path.toSVG();
    if (d) {
      const gx = (x + penX).toFixed(2);
      const alpha = opacity === undefined ? '' : ` opacity="${opacity}"`;
      glyphs.push(
        `<path transform="translate(${gx} ${y.toFixed(2)}) scale(${scale.toFixed(5)} ${(-scale).toFixed(5)})" d="${d}" fill="${fill}"${alpha} />`,
      );
    }
    penX += run.positions[index].xAdvance * scale;
  });
  return glyphs.join('');
}

/** Advance width of one character — uniform, since the face is monospaced. */
export function charWidth(
  font: ReturnType<typeof createFont>,
  fontSize: number,
): number {
  const run = font.layout('0');
  return (run.positions[0].xAdvance * fontSize) / font.unitsPerEm;
}

/** Greedy wrap by column count. Long single words are hard-split. */
export function wrap(text: string, columns: number): string[] {
  const lines: string[] = [];
  let current = '';
  for (const word of text.split(/\s+/)) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= columns) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = word;
    while (current.length > columns) {
      lines.push(current.slice(0, columns));
      current = current.slice(columns);
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function truncate(text: string, columns: number): string {
  return text.length <= columns ? text : `${text.slice(0, columns - 1)}…`;
}

// No XML escaping helper on purpose: every string here becomes glyph outlines
// via textToPaths, so it never lands in XML text content. Escaping it would
// render the entities literally (`&lt;blog@…&gt;`).

export type CardOptions = {
  /** Text in the title bar, e.g. `git show 3e239de — Post Title`. */
  windowTitle: string;
  /** Monospace lines above the headline (commit/Author/Date/Size). */
  metaLines: { label?: string; value: string; accent?: boolean }[];
  /** The large headline, wrapped across up to 4 lines. */
  headline: string;
  /** Left-hand status-bar text. */
  statusLeft: string;
  /** Right-hand status-bar text. */
  statusRight: string;
  /** Lines under the headline (role, stack) — used by the default card. */
  footLines?: { value: string; accent?: boolean }[];
  /** Override the window rect to leave desktop room for `desktopExtras`. */
  win?: { x: number; y: number; w: number; h: number };
  /** Raw SVG painted on the desktop behind the window (e.g. profile icon). */
  desktopExtras?: string;
};

/**
 * Window geometry. The card is a single focused window on the desktop, which
 * is what a visitor sees on a fresh load.
 */
const DEFAULT_WIN = { x: 72, y: 76, w: 1056, h: 478 };
const TITLEBAR_H = 52;
const STATUS_H = 46;
const PAD = 52;

export function buildCard(options: CardOptions): string {
  const {
    windowTitle,
    metaLines,
    headline,
    statusLeft,
    statusRight,
    footLines = [],
    desktopExtras = '',
  } = options;
  const win = options.win ?? DEFAULT_WIN;

  const bodyTop = win.y + TITLEBAR_H;
  const contentX = win.x + PAD;
  const contentW = win.w - PAD * 2;

  // --- Title bar -----------------------------------------------------------
  const titleSize = 22;
  const titleCols = Math.floor((win.w - 190) / charWidth(mono, titleSize));
  const titleText = textToPaths(mono, truncate(windowTitle, titleCols), {
    x: win.x + 92,
    y: win.y + TITLEBAR_H / 2 + titleSize * 0.36,
    fontSize: titleSize,
    fill: COLORS.titlebarText,
  });
  const dots = [0, 1, 2]
    .map(
      (i) =>
        `<circle cx="${win.x + 34 + i * 22}" cy="${win.y + TITLEBAR_H / 2}" r="7.5" fill="${COLORS.titlebarText}" opacity="0.75" />`,
    )
    .join('');
  const closeGlyph = textToPaths(mono, '×', {
    x: win.x + win.w - 44,
    y: win.y + TITLEBAR_H / 2 + 9,
    fontSize: 26,
    fill: COLORS.titlebarText,
    opacity: 0.85,
  });

  // --- Meta block ----------------------------------------------------------
  const metaSize = 21;
  const metaLead = 32;
  let cursorY = bodyTop + PAD + metaSize;
  const metaSvg = metaLines
    .map((line) => {
      const y = cursorY;
      cursorY += metaLead;
      const label = line.label ?? '';
      const labelSvg = label
        ? textToPaths(mono, label, {
            x: contentX,
            y,
            fontSize: metaSize,
            fill: COLORS.muted,
          })
        : '';
      const valueX = contentX + charWidth(mono, metaSize) * label.length;
      const valueSvg = textToPaths(
        line.accent ? monoBold : mono,
        line.value,
        {
          x: valueX,
          y,
          fontSize: metaSize,
          fill: line.accent ? COLORS.amber : COLORS.mutedDeep,
        },
      );
      return labelSvg + valueSvg;
    })
    .join('');

  const statusY = win.y + win.h - STATUS_H;

  // --- Headline ------------------------------------------------------------
  // Shrink to fit the box between the meta block and the status bar. Bounding
  // by line count alone isn't enough: three lines at 46px still overflowed
  // into the status bar, so the loop measures real block height. The trailing
  // cursor needs a column of its own, hence the -1 on the wrap width.
  const footSize = 24;
  const footLead = 34;
  const footBlockH = footLines.length ? footLines.length * footLead + 20 : 0;

  const headAreaTop = cursorY + 22;
  const headAreaBottom = statusY - 26 - footBlockH;
  const headAreaH = headAreaBottom - headAreaTop;
  const MAX_LINES = 4;

  let headSize = 58;
  let headLines: string[] = [];
  let headLead = 0;
  for (;;) {
    const columns = Math.max(
      8,
      Math.floor(contentW / charWidth(monoBold, headSize)) - 1,
    );
    headLines = wrap(headline, columns);
    headLead = Math.round(headSize * 1.26);
    const blockH = (headLines.length - 1) * headLead + headSize;
    if (
      (headLines.length <= MAX_LINES && blockH <= headAreaH) ||
      headSize <= 26
    ) {
      break;
    }
    headSize -= 2;
  }
  const overflowed = headLines.length > MAX_LINES;
  headLines = headLines.slice(0, MAX_LINES);

  const blockH = (headLines.length - 1) * headLead + headSize;
  if (overflowed || blockH > headAreaH) {
    // Fail loudly rather than silently clipping into the status bar, which is
    // what an unbounded line count did before.
    throw new Error(
      `OG card: headline does not fit at the minimum size (${headLines.length} lines @ ${headSize}px, ${blockH.toFixed(0)}px > ${headAreaH.toFixed(0)}px available): "${headline}"`,
    );
  }
  // textToPaths positions by baseline; 0.75em drops the first cap into place.
  const firstBaseline =
    headAreaTop + Math.max(0, (headAreaH - blockH) / 2) + headSize * 0.75;
  const headlineSvg = headLines
    .map((line, index) =>
      textToPaths(monoBold, line, {
        x: contentX,
        y: firstBaseline + index * headLead,
        fontSize: headSize,
        fill: COLORS.ink,
      }),
    )
    .join('');

  // Cursor block after the last line, like the live terminal.
  const lastLine = headLines.at(-1) ?? '';
  const cursorW = charWidth(monoBold, headSize);
  const cursorBaseline = firstBaseline + (headLines.length - 1) * headLead;
  const cursorBlock = `<rect x="${(contentX + cursorW * lastLine.length + cursorW * 0.15).toFixed(2)}" y="${(cursorBaseline - headSize * 0.72).toFixed(2)}" width="${(cursorW * 0.72).toFixed(2)}" height="${(headSize * 0.72).toFixed(2)}" fill="${COLORS.amber}" opacity="0.9" />`;

  // --- Foot lines (default card: role + stack) -----------------------------
  const footSvg = footLines
    .map((line, index) =>
      textToPaths(line.accent ? monoBold : mono, line.value, {
        x: contentX,
        y: headAreaBottom + 20 + (index + 1) * footLead - footLead * 0.28,
        fontSize: footSize,
        fill: line.accent ? COLORS.amber : COLORS.mutedDeep,
      }),
    )
    .join('');

  // --- Status bar ----------------------------------------------------------
  const statusSize = 19;
  const statusLeftSvg = textToPaths(mono, statusLeft, {
    x: contentX,
    y: statusY + STATUS_H / 2 + statusSize * 0.34,
    fontSize: statusSize,
    fill: COLORS.muted,
  });
  const rightW = charWidth(mono, statusSize) * statusRight.length;
  const statusRightSvg = textToPaths(mono, statusRight, {
    x: win.x + win.w - PAD - rightW,
    y: statusY + STATUS_H / 2 + statusSize * 0.34,
    fontSize: statusSize,
    fill: COLORS.amber,
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse">
      <circle cx="12" cy="12" r="1.1" fill="${COLORS.dot}" />
    </pattern>
    <clipPath id="titlebarClip">
      <rect x="${win.x}" y="${win.y}" width="${win.w}" height="${TITLEBAR_H}" />
    </clipPath>
    <pattern id="scanlines" width="4" height="4" patternUnits="userSpaceOnUse">
      <rect width="4" height="1" fill="${COLORS.ink}" opacity="0.05" />
    </pattern>
  </defs>

  <!-- Desktop: cream paper + dot grid (.retro-terminal-desktop) -->
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${COLORS.desktop}" />
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#dots)" />
  ${desktopExtras}

  <!-- Hard retro drop shadow, then the window -->
  <rect x="${win.x + 8}" y="${win.y + 8}" width="${win.w}" height="${win.h}" fill="${COLORS.ink}" opacity="0.16" />
  <rect x="${win.x}" y="${win.y}" width="${win.w}" height="${win.h}" fill="${COLORS.paper}" stroke="${COLORS.ink}" stroke-width="2" />

  <!-- Active title bar (see the titlebar active modifier in retro.css) -->
  <g clip-path="url(#titlebarClip)">
    <rect x="${win.x}" y="${win.y}" width="${win.w}" height="${TITLEBAR_H}" fill="${COLORS.amber}" />
  </g>
  ${dots}
  ${titleText}
  ${closeGlyph}
  <line x1="${win.x}" y1="${bodyTop}" x2="${win.x + win.w}" y2="${bodyTop}" stroke="${COLORS.ink}" stroke-width="2" />

  ${metaSvg}
  ${headlineSvg}
  ${cursorBlock}
  ${footSvg}

  <!-- Status bar -->
  <line x1="${win.x}" y1="${statusY}" x2="${win.x + win.w}" y2="${statusY}" stroke="${COLORS.border}" stroke-width="2" />
  <rect x="${win.x + 2}" y="${statusY + 2}" width="${win.w - 4}" height="${STATUS_H - 4}" fill="${COLORS.desktop}" opacity="0.6" />
  ${statusLeftSvg}
  ${statusRightSvg}

  <!-- CRT scanlines, kept faint so text stays crisp at feed thumbnail sizes -->
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#scanlines)" />
</svg>`;
}
