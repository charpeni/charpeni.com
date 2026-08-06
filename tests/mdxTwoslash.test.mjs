import assert from 'node:assert/strict';
import test from 'node:test';

import { serializeMdxContent } from '../utils/mdx.ts';

test('renders TypeScript types and diagnostics in Twoslash snippets', async () => {
  const source = [
    '```typescript twoslash',
    '// @errors: 2322',
    'type HiddenSetup = { hidden: true };',
    '// ---cut---',
    'const message: string = 123; // ^? const message: string',
    '```',
  ].join('\n');

  const { compiledSource } = await serializeMdxContent(source);

  assert.match(compiledSource, /twoslash-query-line/);
  assert.match(
    compiledSource,
    /className: "twoslash-popup-code"[\s\S]*?children: "const"[\s\S]*?children: " message"[\s\S]*?children: ":"[\s\S]*?children: " string"/,
  );
  assert.match(
    compiledSource,
    /className: "twoslash-meta-line twoslash-error-line",\s+children: "Type 'number' is not assignable to type 'string'\."/,
  );
  assert.match(
    compiledSource,
    /"--twoslash-query-arrow-offset": "calc\(9\.5ch - 1em\)"/,
  );
  assert.match(
    compiledSource,
    /className: "twoslash-copy-source",\s+hidden: true,\s+children: "const message: string = 123; \/\/ \^\? const message: string"/,
  );
  assert.doesNotMatch(compiledSource, /HiddenSetup/);
  assert.doesNotMatch(compiledSource, /@errors/);
  assert.doesNotMatch(compiledSource, /---cut---/);
});
