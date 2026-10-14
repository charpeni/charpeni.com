/**
 * Pre-renders every ```mermaid fence in posts/*.mdx to an SVG under
 * src/data/mermaid/<id>.svg, which src/lib/mermaidDiagrams.ts inlines in
 * place of the fence at build time. See that module for why diagrams are
 * rendered ahead of time instead of at build or in the browser.
 *
 * Mermaid lays the diagram out in headless Chromium with Fixel Text at 14px
 * loaded, the font and size the site renders the labels in, so label boxes
 * fit their text.
 * Math.random is seeded per diagram (gitGraph draws commit ids from it), so
 * re-running the script rewrites unchanged diagrams byte-identically.
 *
 * Only gitGraph is supported: Mermaid's theme <style> is stripped, and
 * src/styles/app.css only styles gitGraph's classes. Another diagram type
 * needs its own `.mermaid-diagram` rules first.
 *
 * Run manually after adding or editing a diagram:
 *   node scripts/generateMermaidDiagrams.ts
 *
 * Then commit src/data/mermaid/. Stale SVGs are deleted.
 */

import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import { chromium } from 'playwright';

import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { MERMAID_DIR, mermaidDiagramId } from '../src/lib/mermaidDiagrams.ts';

const ROOT = process.cwd();
const POSTS_DIR = path.join(ROOT, 'posts');

// Same parser family as the MDX pipeline, so the fence body (and therefore
// the id) matches what rehypeMermaid hashes.
const diagrams = new Map<string, { source: string; file: string }>();
for (const file of (await readdir(POSTS_DIR)).filter((f) =>
  f.endsWith('.mdx'),
)) {
  const tree = unified()
    .use(remarkParse)
    .parse(await readFile(path.join(POSTS_DIR, file), 'utf8'));
  visit(tree, 'code', (node) => {
    if (node.lang !== 'mermaid') return;
    diagrams.set(mermaidDiagramId(node.value), { source: node.value, file });
  });
}

const fixel = (await readFile(
  path.join(ROOT, 'public', 'fonts', 'FixelText-Regular.woff2'),
)).toString('base64');
const mermaidBundle = path.join(
  ROOT,
  'node_modules',
  'mermaid',
  'dist',
  'mermaid.min.js',
);

const browser = await chromium.launch();
await mkdir(MERMAID_DIR, { recursive: true });

for (const [id, { source, file }] of diagrams) {
  const page = await browser.newPage();
  await page.setContent(
    `<style>@font-face{font-family:'Fixel Text';src:url(data:font/woff2;base64,${fixel}) format('woff2')}</style>`,
  );
  await page.addScriptTag({ path: mermaidBundle });

  let svg: string;
  try {
    svg = await page.evaluate(
      async (diagram) => {
        await document.fonts.load("16px 'Fixel Text'");
        // Seeded right before rendering (mulberry32), so a diagram's output
        // never depends on what ran before it.
        let seed = 0x9e3779b9;
        Math.random = () => {
          seed = (seed + 0x6d2b79f5) | 0;
          let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
          t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
          return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
        const { mermaid } = window as unknown as {
          mermaid: {
            initialize(config: object): void;
            detectType(source: string): string;
            render(id: string, source: string): Promise<{ svg: string }>;
          };
        };
        mermaid.initialize({
          startOnLoad: false,
          theme: 'base',
          fontFamily: "'Fixel Text'",
          // Label boxes are sized for this; keep in sync with app.css.
          themeVariables: { fontSize: '14px' },
        });
        const type = mermaid.detectType(diagram.source);
        if (type !== 'gitGraph') {
          throw new Error(`unsupported diagram type "${type}"`);
        }
        return (await mermaid.render(diagram.id, diagram.source)).svg;
      },
      { id, source },
    );
  } catch (error) {
    throw new Error(`posts/${file}: ${(error as Error).message}`, {
      cause: error,
    });
  }
  await page.close();

  svg = svg
    // Theme colors come from the site stylesheet instead.
    .replace(/<style>[\s\S]*?<\/style>/, '')
    // Gradient for Mermaid's "neo" look, which gitGraph never references.
    .replace(/<defs><linearGradient[\s\S]*?<\/defs>/, '');
  await writeFile(path.join(MERMAID_DIR, `${id}.svg`), `${svg}\n`);
  console.log(`Generated src/data/mermaid/${id}.svg (posts/${file})`);
}

await browser.close();

for (const existing of await readdir(MERMAID_DIR)) {
  if (existing.endsWith('.svg') && !diagrams.has(existing.slice(0, -4))) {
    await rm(path.join(MERMAID_DIR, existing));
    console.log(`Deleted stale src/data/mermaid/${existing}`);
  }
}

console.log(`\nGenerated ${diagrams.size} Mermaid diagram(s).`);
