import assert from 'node:assert/strict';
import test from 'node:test';

import {
  effectiveQ,
  parseAcceptHeader,
  preferredFormat,
} from '../src/utils/acceptHeader.ts';

test('parseAcceptHeader splits ranges and reads q-values', () => {
  assert.deepEqual(parseAcceptHeader('text/markdown'), [
    { type: 'text', subtype: 'markdown', q: 1 },
  ]);
  assert.deepEqual(parseAcceptHeader('text/html;q=0.8, */*;q=0.1'), [
    { type: 'text', subtype: 'html', q: 0.8 },
    { type: '*', subtype: '*', q: 0.1 },
  ]);
  // Case/whitespace-insensitive; q clamped to [0, 1]; malformed q → 1.
  assert.deepEqual(parseAcceptHeader('TEXT/MARKDOWN ; Q=0.5'), [
    { type: 'text', subtype: 'markdown', q: 0.5 },
  ]);
  assert.equal(parseAcceptHeader('text/html;q=7')[0].q, 1);
  assert.equal(parseAcceptHeader('text/html;q=abc')[0].q, 1);
  // Malformed elements are skipped, valid ones kept.
  assert.deepEqual(parseAcceptHeader('garbage, text/html'), [
    { type: 'text', subtype: 'html', q: 1 },
  ]);
  assert.deepEqual(parseAcceptHeader(''), []);
});

test('effectiveQ prefers the most specific matching range', () => {
  const ranges = parseAcceptHeader('text/markdown;q=0.2, text/*;q=0.9, */*');
  assert.deepEqual(effectiveQ(ranges, 'text', 'markdown'), {
    q: 0.2,
    exact: true,
  });
  assert.deepEqual(effectiveQ(ranges, 'text', 'html'), {
    q: 0.9,
    exact: false,
  });
  assert.deepEqual(effectiveQ(ranges, 'image', 'png'), {
    q: 1,
    exact: false,
  });
  assert.deepEqual(effectiveQ([], 'text', 'html'), { q: 0, exact: false });
});

test('preferredFormat serves markdown only on explicit text/markdown', () => {
  const cases = [
    // [header, expected]
    ['text/markdown', 'markdown'],
    ['text/markdown, text/html', 'markdown'], // explicit tie → markdown
    ['text/markdown;q=0.9, text/html;q=0.1', 'markdown'],
    ['text/html;q=0.2, text/markdown;q=0.9', 'markdown'],
    ['text/markdown;q=0.1, text/html', 'html'],
    ['text/html, text/markdown;q=0.5', 'html'],
    // Wildcards never flip to markdown.
    ['*/*', 'html'],
    ['text/*', 'html'],
    [
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'html',
    ], // Chrome default
    ['text/markdown;q=0, */*', 'html'],
    // …except when HTML is explicitly excluded and markdown is still
    // wildcard-acceptable: serving something beats a 406.
    ['text/*, text/html;q=0', 'markdown'],
    // Nothing acceptable → 406.
    ['application/json', 'none'],
    ['image/png', 'none'],
    ['text/markdown;q=0', 'none'],
    ['text/markdown;q=0, text/html;q=0', 'none'],
    // Absent/empty/unparseable → default representation.
    [null, 'html'],
    ['', 'html'],
    ['   ', 'html'],
    ['garbage', 'html'],
  ];
  for (const [header, expected] of cases) {
    assert.equal(
      preferredFormat(header),
      expected,
      `Accept: ${JSON.stringify(header)}`,
    );
  }
});
