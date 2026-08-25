/**
 * RFC 9110 Accept-header negotiation between the two representations the
 * canonical URLs serve: HTML and Markdown (acceptmarkdown.com). Dependency-
 * free and erasable-syntax only, because it runs in two very different
 * places: bundled into the Cloudflare worker entry (src/worker.ts) by Vite,
 * and imported as raw .ts by tests/acceptHeader.test.mjs through Node's type
 * stripping — which is also why importers must use a relative path, not the
 * `@/` alias (type stripping resolves no aliases).
 */

export type MediaRange = {
  type: string;
  subtype: string;
  q: number;
};

export type PreferredFormat = 'html' | 'markdown' | 'none';

/**
 * Parses an Accept header into media ranges with q-values. Lenient where
 * RFC 9110 allows: malformed elements are skipped, a malformed q-value falls
 * back to 1 instead of dropping the range, and quoted-string parameters
 * containing `,`/`;` are not handled (they never occur in real Accept
 * headers).
 */
export function parseAcceptHeader(header: string): MediaRange[] {
  const ranges: MediaRange[] = [];
  for (const element of header.split(',')) {
    const [range, ...params] = element.split(';');
    const match = range
      .trim()
      .toLowerCase()
      .match(/^([a-z0-9!#$%&'*+.^_`|~-]+)\/([a-z0-9!#$%&'*+.^_`|~-]+)$/);
    if (!match) continue;
    let q = 1;
    for (const param of params) {
      const [name, value] = param.split('=');
      if (name.trim().toLowerCase() === 'q') {
        const parsed = Number.parseFloat(value ?? '');
        q = Number.isNaN(parsed) ? 1 : Math.min(1, Math.max(0, parsed));
      }
    }
    ranges.push({ type: match[1], subtype: match[2], q });
  }
  return ranges;
}

/**
 * The q-value that applies to `type/subtype`, taking the most specific
 * matching range (exact beats subtype wildcard beats full wildcard;
 * RFC 9110 §12.5.1) and the highest q among equally specific ones. `exact`
 * reports whether the winning range named the media type literally rather
 * than through a wildcard.
 */
export function effectiveQ(
  ranges: MediaRange[],
  type: string,
  subtype: string,
): { q: number; exact: boolean } {
  let best: { specificity: number; q: number } | undefined;
  for (const range of ranges) {
    let specificity: number;
    if (range.type === type && range.subtype === subtype) specificity = 3;
    else if (range.type === type && range.subtype === '*') specificity = 2;
    else if (range.type === '*' && range.subtype === '*') specificity = 1;
    else continue;
    if (
      !best ||
      specificity > best.specificity ||
      (specificity === best.specificity && range.q > best.q)
    ) {
      best = { specificity, q: range.q };
    }
  }
  return { q: best?.q ?? 0, exact: best?.specificity === 3 };
}

/**
 * Which representation a negotiated URL should serve for this Accept header.
 *
 * - Markdown wins only when `text/markdown` is listed literally with q > 0
 *   at least as high as HTML's — wildcard ranges alone never flip away from
 *   the HTML default, so browser Accept strings keep getting HTML.
 *   Exception: when HTML is explicitly excluded (q=0) and markdown is still
 *   wildcard-acceptable, serving markdown beats a 406.
 * - Absent, empty, or unparseable headers mean "anything" → HTML.
 * - 'none' (→ 406) only when neither representation is acceptable.
 */
export function preferredFormat(header: string | null): PreferredFormat {
  if (header === null || header.trim() === '') return 'html';
  const ranges = parseAcceptHeader(header);
  if (ranges.length === 0) return 'html';
  const markdown = effectiveQ(ranges, 'text', 'markdown');
  const html = effectiveQ(ranges, 'text', 'html');
  if (markdown.q === 0 && html.q === 0) return 'none';
  if (markdown.exact && markdown.q > 0 && markdown.q >= html.q) {
    return 'markdown';
  }
  return html.q > 0 ? 'html' : 'markdown';
}
