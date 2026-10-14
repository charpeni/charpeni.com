import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';

import rehypeStringify from 'rehype-stringify';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';

import { rehypePlugins } from '../src/lib/mdxPipeline.ts';
import { MERMAID_DIR, mermaidDiagramId } from '../src/lib/mermaidDiagrams.ts';

/**
 * Coverage for the pre-rendered Mermaid diagrams (src/lib/mermaidDiagrams.ts):
 * the committed SVGs in src/data/mermaid/ must match the fences in posts/
 * exactly, since scripts/generateMermaidDiagrams.ts is run by hand.
 */
function renderMarkdown(source) {
  return unified()
    .use(remarkParse)
    .use(remarkRehype)
    .use(rehypePlugins)
    .use(rehypeStringify)
    .process(source)
    .then((file) => String(file));
}

function postFences() {
  const postsDir = new URL('../posts/', import.meta.url);
  const fences = [];
  for (const file of readdirSync(postsDir)) {
    if (!file.endsWith('.mdx')) continue;
    const tree = unified()
      .use(remarkParse)
      .parse(readFileSync(new URL(file, postsDir), 'utf8'));
    visit(tree, 'code', (node) => {
      if (node.lang === 'mermaid') fences.push({ file, source: node.value });
    });
  }
  return fences;
}

test('every Mermaid fence in posts/ has a pre-rendered SVG, and none is stale', () => {
  const expected = new Set(
    postFences().map(({ source }) => `${mermaidDiagramId(source)}.svg`),
  );
  const committed = new Set(
    readdirSync(MERMAID_DIR).filter((file) => file.endsWith('.svg')),
  );

  // Fails when a diagram was added or edited without re-running
  // `node scripts/generateMermaidDiagrams.ts`.
  assert.deepEqual(committed, expected);
});

test('replaces a Mermaid fence with its pre-rendered, unthemed SVG', async () => {
  const [fence] = postFences();
  assert.ok(fence, 'expected at least one Mermaid fence in posts/');

  const html = await renderMarkdown(
    ['```mermaid', fence.source, '```'].join('\n'),
  );

  assert.match(
    html,
    new RegExp(
      `^<figure class="mermaid-diagram"><svg id="${mermaidDiagramId(fence.source)}"`,
    ),
  );
  assert.match(html, /role="graphics-document document"/);
  // Shiki never saw the fence, and Mermaid's own theme was stripped so the
  // site stylesheet colors the diagram.
  assert.doesNotMatch(html, /language-mermaid|shiki/);
  assert.doesNotMatch(html, /<style>/);
});

test('fails the build when a fence has no pre-rendered SVG', async () => {
  await assert.rejects(
    renderMarkdown(
      ['```mermaid', 'gitGraph', '  commit id: "new"', '```'].join('\n'),
    ),
    /Run `node scripts\/generateMermaidDiagrams\.ts`/,
  );
});
