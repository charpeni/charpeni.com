import assert from 'node:assert/strict';
import test from 'node:test';

import rehypeStringify from 'rehype-stringify';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';

import { rehypeExternalLinks, rehypePlugins } from '../src/lib/mdxPipeline.ts';

/**
 * Coverage for rehypeExternalLinks (src/lib/mdxPipeline.ts): the
 * `.external-link` class that global.css draws the arrow icon from.
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

test('tags absolute http(s) links as external', async () => {
  const html = await renderMarkdown(
    [
      '[https](https://github.com/charpeni) and [http](http://example.com)',
      'and [`code`](https://developer.mozilla.org).',
    ].join('\n'),
  );

  assert.match(
    html,
    /<a href="https:\/\/github.com\/charpeni" class="external-link">https<\/a>/,
  );
  assert.match(
    html,
    /<a href="http:\/\/example.com" class="external-link">http<\/a>/,
  );
  assert.match(
    html,
    /<a href="https:\/\/developer.mozilla.org" class="external-link"><code>code<\/code><\/a>/,
  );
});

test('leaves on-site, anchor, and mailto links alone', async () => {
  const html = await renderMarkdown(
    [
      '[post](/blog/some-post) [section](#section)',
      '[mail](mailto:blog@nicolascharpentier.com)',
      '',
      '## Heading',
    ].join('\n'),
  );

  assert.doesNotMatch(html, /external-link/);
});

// The hast node MDX emits for an anchor written as JSX in a post body.
function jsxAnchor(attributes) {
  return {
    type: 'mdxJsxTextElement',
    name: 'a',
    attributes: attributes.map(([name, value]) => ({
      type: 'mdxJsxAttribute',
      name,
      value,
    })),
    children: [],
  };
}

function jsxClassName(node) {
  return node.attributes.find((a) => a.name === 'className')?.value;
}

test('tags JSX anchors in MDX, keeping their existing className', () => {
  const external = jsxAnchor([['href', 'https://github.com/mattpocock']]);
  const styled = jsxAnchor([
    ['href', 'https://github.com/mattpocock'],
    ['className', 'img-link'],
  ]);
  const local = jsxAnchor([['href', '/static/images/tldr.png']]);

  rehypeExternalLinks()({
    type: 'root',
    children: [external, styled, local],
  });

  assert.equal(jsxClassName(external), 'external-link');
  assert.equal(jsxClassName(styled), 'img-link external-link');
  assert.equal(jsxClassName(local), undefined);
});
