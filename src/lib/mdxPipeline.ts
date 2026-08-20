import rehypeShiki from '@shikijs/rehype';
import {
  defaultHoverInfoProcessor,
  rendererRich,
  transformerTwoslash,
} from '@shikijs/twoslash';
import { fromHtmlIsomorphic } from 'hast-util-from-html-isomorphic';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeCallouts from 'rehype-callouts';
import rehypeCodeTitles from 'rehype-code-titles';
import rehypeSlug from 'rehype-slug';
import { visit } from 'unist-util-visit';

/**
 * The MDX rehype pipeline, ported verbatim from the Next.js site's
 * utils/mdx.ts (which fed next-mdx-remote's serialize()). Astro's built-in
 * syntax highlighting is disabled in astro.config.mjs so this chain has full
 * control — the Twoslash popups, the `.twoslash-copy-source` contract the
 * copy button reads, and the query-arrow offsets all depend on it.
 *
 * tests/mdxTwoslash.test.mjs asserts against this pipeline's rendered HTML.
 */

/**
 * Astro's MDX pipeline drops `code.meta` on the mdast→hast transition
 * (verified: every fence reached Shiki with an empty `meta.__raw`), which
 * silently disables the explicit-trigger Twoslash. The remark half persists
 * the fence meta as an hProperty; the rehype half restores it to the
 * `data.meta` slot @shikijs/rehype reads, then drops the attribute so it
 * never reaches the HTML.
 */
export function remarkPreserveCodeMeta() {
  return (tree: unknown) => {
    visit(
      tree as never,
      'code',
      (node: {
        meta?: string;
        data?: { hProperties?: Record<string, unknown> };
      }) => {
        if (node.meta) {
          node.data ??= {};
          node.data.hProperties ??= {};
          node.data.hProperties.metastring = node.meta;
        }
      },
    );
  };
}

function rehypeRestoreCodeMeta() {
  return (tree: unknown) => {
    visit(
      tree as never,
      'element',
      (node: {
        tagName?: string;
        properties?: Record<string, unknown>;
        data?: { meta?: string };
      }) => {
        if (node.tagName === 'code' && node.properties?.metastring) {
          node.data ??= {};
          node.data.meta = String(node.properties.metastring);
          delete node.properties.metastring;
        }
      },
    );
  };
}

function createTwoslashRenderer() {
  const renderer = rendererRich({ queryRendering: 'line' });
  const renderLineQuery = renderer.lineQuery;

  if (!renderLineQuery) return renderer;

  renderer.lineQuery = function (query, node) {
    const result = renderLineQuery.call(this, query, node);
    const content = defaultHoverInfoProcessor(query.text ?? '');
    const prefixLength =
      content.match(/^(?:const|let|var|type|function|class|enum)\s+/)?.[0]
        .length ?? 0;
    const target =
      node?.type === 'element' && node.children[0]?.type === 'text'
        ? node.children[0].value
        : '';
    const targetCenter = prefixLength + target.length / 2;

    if (!targetCenter) return result;

    const line = result[0];
    if (line?.type !== 'element') return result;

    const popup = line.children.find(
      (child) =>
        child.type === 'element' &&
        String(child.properties.class).includes('twoslash-popup-container'),
    );

    if (popup?.type === 'element') {
      popup.properties.style = `--twoslash-query-arrow-offset: calc(${targetCenter}ch - 1em); --twoslash-query-popup-offset: calc(1em - ${targetCenter}ch)`;
    }

    return result;
  };

  return renderer;
}

type ShikiTransformerOptions = { meta?: { __raw?: string } };

function isTwoslash(options: ShikiTransformerOptions) {
  return options.meta?.__raw?.split(/\s+/).includes('twoslash') ?? false;
}

function extractCopyableTwoslashCode(code: string) {
  let lines = code.split('\n');
  const cutBefore = lines.findLastIndex((line) =>
    /^\s*\/\/ ---cut(?:-before)?---\s*$/.test(line),
  );
  if (cutBefore !== -1) lines = lines.slice(cutBefore + 1);

  const cutAfter = lines.findIndex((line) =>
    /^\s*\/\/ ---cut-after---\s*$/.test(line),
  );
  if (cutAfter !== -1) lines = lines.slice(0, cutAfter);

  let insideCut = false;
  return lines
    .filter((line) => {
      if (/^\s*\/\/ ---cut-start---\s*$/.test(line)) {
        insideCut = true;
        return false;
      }
      if (/^\s*\/\/ ---cut-end---\s*$/.test(line)) {
        insideCut = false;
        return false;
      }
      return !insideCut && !/^\s*\/\/ @\w+(?::.*)?\s*$/.test(line);
    })
    .join('\n');
}

function transformerTwoslashCopySource() {
  let copySource: string | undefined;

  return [
    {
      name: 'capture-twoslash-copy-source',
      enforce: 'pre' as const,
      preprocess(code: string, options: ShikiTransformerOptions) {
        if (isTwoslash(options)) {
          copySource = extractCopyableTwoslashCode(code);
        }
      },
    },
    {
      name: 'attach-twoslash-copy-source',
      enforce: 'post' as const,
      root(node: {
        children: Array<{
          type: string;
          tagName?: string;
          children?: unknown[];
        }>;
      }) {
        const pre = node.children.find(
          (child) => child.type === 'element' && child.tagName === 'pre',
        );
        if (copySource === undefined || !pre?.children) return;

        pre.children.push({
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['twoslash-copy-source'],
            hidden: true,
          },
          children: [{ type: 'text', value: copySource }],
        });
        copySource = undefined;
      },
    },
  ];
}

function normalizeInlineTwoslashQueries() {
  return {
    name: 'normalize-inline-twoslash-queries',
    preprocess(code: string, options: ShikiTransformerOptions) {
      if (!isTwoslash(options)) return;

      return code.replaceAll(
        /^(\s*(?:const|let|var|type|function|class|enum)\s+([\w$]+).*?)\s+\/\/\s*\^\?(.*)$/gm,
        (
          line,
          statement: string,
          identifier: string,
          documentedType: string,
        ) => {
          const identifierOffset = statement.indexOf(identifier);
          if (identifierOffset < 2) return line;

          return `${statement}\n//${' '.repeat(identifierOffset - 2)}^?${documentedType}`;
        },
      );
    },
  };
}

export const rehypePlugins = [
  rehypeRestoreCodeMeta,
  rehypeSlug,
  [
    rehypeAutolinkHeadings,
    {
      headingProperties: {
        className: ['content-header'],
      },
      content: fromHtmlIsomorphic(
        '<span class="content-header-link"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-link"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></span>',
        { fragment: true },
      ).children,
    },
  ],
  rehypeCodeTitles,
  rehypeCallouts,
  [
    rehypeShiki,
    {
      themes: {
        light: 'github-light',
        dark: 'dark-plus',
      },
      defaultColor: 'dark',
      transformers: [
        ...transformerTwoslashCopySource(),
        normalizeInlineTwoslashQueries(),
        transformerTwoslash({
          explicitTrigger: true,
          renderer: createTwoslashRenderer(),
          twoslashOptions: {
            handbookOptions: {
              noStaticSemanticInfo: true,
            },
          },
        }),
      ],
    },
  ],
] as any[];
