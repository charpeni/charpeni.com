import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { fromHtmlIsomorphic } from 'hast-util-from-html-isomorphic';
import { visit } from 'unist-util-visit';

/**
 * Mermaid diagrams, pre-rendered. A ```mermaid fence in a post is replaced at
 * compile time by an inline SVG that scripts/generateMermaidDiagrams.ts
 * rendered ahead of time and committed under src/data/mermaid/. Mermaid needs
 * a real browser to lay text out, which neither the Cloudflare build nor its
 * prerender sandbox has, and shipping its runtime to readers would cost
 * ~1MB of JS for a static picture.
 *
 * The generator strips Mermaid's own theme <style>, so the inline SVG is
 * colored by the `.mermaid-diagram` rules in src/styles/app.css and follows
 * the reader light/dark toggle and the retro skin.
 */

export const MERMAID_DIR = fileURLToPath(
  new URL('../data/mermaid/', import.meta.url),
);

/** Stable id for a diagram source: its file name and the SVG's root id. */
export function mermaidDiagramId(source: string): string {
  const normalized = source.replace(/\r\n/g, '\n').trim();
  const digest = createHash('sha256').update(normalized).digest('hex');
  return `mermaid-${digest.slice(0, 12)}`;
}

type HastNode = {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

function textContent(node: HastNode): string {
  if (node.type === 'text') return node.value ?? '';
  return (node.children ?? []).map(textContent).join('');
}

/**
 * Swaps every `<pre><code class="language-mermaid">` for its pre-rendered
 * SVG. Must run before Shiki, which would otherwise highlight the fence as
 * code. A missing SVG fails the build rather than shipping the raw source.
 */
export function rehypeMermaid() {
  return (tree: unknown) => {
    visit(
      tree as never,
      'element',
      (node: HastNode, index: number | undefined, parent?: HastNode) => {
        if (node.tagName !== 'pre' || !parent || index === undefined) return;
        const code = node.children?.find((child) => child.tagName === 'code');
        const className = code?.properties?.className;
        if (
          !code ||
          !Array.isArray(className) ||
          !className.includes('language-mermaid')
        ) {
          return;
        }

        const id = mermaidDiagramId(textContent(code));
        const file = `${MERMAID_DIR}${id}.svg`;
        if (!existsSync(file)) {
          throw new Error(
            `No pre-rendered SVG for Mermaid diagram ${id}. Run \`node scripts/generateMermaidDiagrams.ts\` and commit src/data/mermaid/.`,
          );
        }

        parent.children![index] = {
          type: 'element',
          tagName: 'figure',
          properties: { className: ['mermaid-diagram'] },
          children: fromHtmlIsomorphic(readFileSync(file, 'utf8'), {
            fragment: true,
          }).children as HastNode[],
        };
      },
    );
  };
}
