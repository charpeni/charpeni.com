import assert from 'node:assert/strict';
import test from 'node:test';

import rehypeStringify from 'rehype-stringify';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';

import { rehypePlugins } from '../src/lib/mdxPipeline.ts';

/**
 * Regression coverage for the bespoke Twoslash pipeline in
 * src/lib/mdxPipeline.ts, exercised through the same rehype chain
 * astro.config.mjs registers. remark-parse + remark-rehype stand in for
 * Astro's MDX front half: the default mdast→hast code handler carries the
 * fence meta ("twoslash") into `node.data.meta`, which @shikijs/rehype
 * exposes to the transformers as `options.meta.__raw` — the exact contract
 * the custom transformers key on in production.
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

test('renders TypeScript types and diagnostics in Twoslash snippets', async () => {
  const source = [
    '```typescript twoslash',
    '// @errors: 2322',
    'type HiddenSetup = { hidden: true };',
    '// ---cut---',
    'const message: string = 123; // ^? const message: string',
    '```',
  ].join('\n');

  const html = await renderMarkdown(source);

  // normalizeInlineTwoslashQueries turned the trailing `// ^?` comment into
  // a line query, rendered by the rich renderer's line mode.
  assert.match(html, /twoslash-query-line/);
  assert.match(
    html,
    /class="twoslash-popup-code"[\s\S]*?>const<\/span>[\s\S]*?> message<\/span>[\s\S]*?>:<\/span>[\s\S]*?> string<\/span>/,
  );
  assert.match(
    html,
    /class="twoslash-meta-line twoslash-error-line">Type 'number' is not assignable to type 'string'\.</,
  );
  // Arrow offset math: `const ` prefix (6ch) + half of `message` (3.5ch).
  assert.match(html, /--twoslash-query-arrow-offset: calc\(9\.5ch - 1em\)/);
  assert.match(html, /--twoslash-query-popup-offset: calc\(1em - 9\.5ch\)/);
  // The copy button's source of truth: the ORIGINAL single-line statement
  // (captured before query normalization), with cut markers and @-directives
  // stripped.
  assert.match(
    html,
    /<span class="twoslash-copy-source" hidden>const message: string = 123; \/\/ \^\? const message: string<\/span>/,
  );
  assert.doesNotMatch(html, /HiddenSetup/);
  assert.doesNotMatch(html, /@errors/);
  assert.doesNotMatch(html, /---cut---/);
});

test('strips cut-start/cut-end regions and directives from the copy source', async () => {
  const source = [
    '```typescript twoslash',
    '// @noErrors',
    'const kept = 1;',
    '// ---cut-start---',
    'const hiddenFromCopy = 2;',
    '// ---cut-end---',
    'const alsoKept = 3;',
    '```',
  ].join('\n');

  const html = await renderMarkdown(source);

  assert.match(
    html,
    /<span class="twoslash-copy-source" hidden>const kept = 1;\nconst alsoKept = 3;<\/span>/,
  );
  assert.doesNotMatch(html, /twoslash-copy-source" hidden>[\s\S]*?@noErrors/);
});

test('leaves non-Twoslash fences highlighted but untouched by the Twoslash transformers', async () => {
  const source = [
    '```typescript',
    'const message: string = "hello"; // ^? not a twoslash query',
    '```',
  ].join('\n');

  const html = await renderMarkdown(source);

  // Plain Shiki dual-theme output, no Twoslash decoration. (The sample's
  // comment contains the literal word "twoslash", so assert on the class
  // prefix and copy-source span instead of the bare word.)
  assert.match(html, /<pre[^>]*class="[^"]*shiki[^"]*"/);
  assert.doesNotMatch(html, /class="[^"]*twoslash/);
  assert.doesNotMatch(html, /twoslash-copy-source/);
  // The `// ^?` comment stays inline: normalizeInlineTwoslashQueries only
  // rewrites fences whose meta includes `twoslash`.
  assert.match(html, /\/\/ \^\? not a twoslash query/);
});
