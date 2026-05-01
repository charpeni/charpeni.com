/**
 * Rewrites root-relative URLs in raw MDX/Markdown content to absolute URLs
 * prefixed with the site's origin. Used by the markdown API endpoint so that
 * when a post is copied / fetched out-of-context (e.g. pasted into an LLM as
 * context), every link still resolves.
 *
 * What gets rewritten:
 * - Markdown links and images: `](/path)` → `](https://site.com/path)`
 * - JSX attributes that carry URLs (`src`, `href`, `poster`, `srcSet`),
 *   whether the value is a string literal (`="/..."`, `='/...'`) or a JSX
 *   expression wrapping a single literal (`={"/..."}`, `={'/...'}`,
 *   `` ={`/...`} ``). Template literals containing interpolation
 *   (`${...}`) are left alone since the resolved value is unknown at
 *   transform time.
 * - Frontmatter `image:` field (single- or double-quoted root-relative path)
 *
 * What is preserved as-is:
 * - External URLs (`https://`, `http://`)
 * - Protocol-relative URLs (`//cdn.example.com/...`)
 * - Anchor links (`#section`)
 * - Dot-relative paths (`./foo`, `../bar`)
 * - Anything inside fenced code blocks (```...```) or inline code (`...`),
 *   so code samples that happen to contain markdown link syntax aren't
 *   accidentally rewritten.
 *
 * The frontmatter is treated as a single contiguous block at the top of the
 * file (delimited by `---` lines) and is processed separately so YAML keys
 * like `image: '/static/...'` are reachable without having to write a full
 * YAML parser.
 */

// Match `](/path)` and `](/path "title")`. The `(?!\/)` lookahead excludes
// protocol-relative URLs like `//cdn.example.com` which also start with `/`.
const ROOT_RELATIVE_LINK_RE = /\]\((\/(?!\/)[^)\s]*)((?:\s+"[^"]*")?)\)/g;

// Match URL-bearing JSX attributes whose value is a string literal
// (double- or single-quoted) referencing a root-relative path. The
// attribute-name list is intentionally narrow to limit blast radius. The
// `(?<![\w-])` lookbehind ensures we don't match attribute *suffixes* like
// `data-src=` or `someSrc=` — only standalone attributes whose name appears
// after whitespace, `<`, or another attribute boundary.
const JSX_ATTR_STRING_RE =
  /(?<![\w-])(src|href|poster|srcSet)=(["'])(\/(?!\/)[^"']*)\2/g;

// Match the same attributes when the value is a JSX expression containing a
// single literal: `{"/path"}`, `{'/path'}`, or `` {`/path`} ``. Template
// literals with interpolation (`${...}`) are excluded by `[^`$]*` — we only
// match template literals whose content is purely a static path.
const JSX_ATTR_EXPRESSION_RE =
  /(?<![\w-])(src|href|poster|srcSet)=\{(["'])(\/(?!\/)[^"']*)\2\}|(?<![\w-])(src|href|poster|srcSet)=\{`(\/(?!\/)[^`$]*)`\}/g;

// Combined pattern that matches anything we want to leave untouched in prose:
// either a fenced code block (``` … ```) or an inline code span (` … `).
// Used with `String.split` so the captured groups become odd-indexed entries
// in the resulting array. Even-indexed entries are then safe to transform.
const PROTECTED_REGIONS_RE = /(```[^\n]*\n[\s\S]*?\n```|`[^`\n]*`)/g;

function rewriteJsxAttributes(input: string, siteUrl: string): string {
  return input
    .replaceAll(
      JSX_ATTR_STRING_RE,
      (_match, attr: string, quote: string, path: string) =>
        `${attr}=${quote}${siteUrl}${path}${quote}`,
    )
    .replaceAll(
      JSX_ATTR_EXPRESSION_RE,
      (
        _match,
        attrA: string | undefined,
        quote: string | undefined,
        pathA: string | undefined,
        attrB: string | undefined,
        pathB: string | undefined,
      ) => {
        // Quoted form: src={"/path"} or src={'/path'}
        if (attrA && quote && pathA) {
          return `${attrA}={${quote}${siteUrl}${pathA}${quote}}`;
        }
        // Template-literal form: src={`/path`}
        return `${attrB}={\`${siteUrl}${pathB}\`}`;
      },
    );
}

function absolutizeBody(body: string, siteUrl: string): string {
  // JSX-attribute rewrites run first, before splitting on protected regions.
  // This is necessary because JSX template literals (`src={`/path`}`) use
  // backticks that the inline-code regex would otherwise match, hiding the
  // attribute from later passes. The trade-off: a JSX attribute literally
  // present inside a code-fenced sample would also be rewritten. No current
  // post does this, and if one ever does the fix is to escape it differently
  // in the sample.
  const withJsxRewrites = rewriteJsxAttributes(body, siteUrl);

  const segments = withJsxRewrites.split(PROTECTED_REGIONS_RE);

  return segments
    .map((segment, index) => {
      // Odd-indexed segments are protected (fenced code or inline code) —
      // leave them untouched so code samples aren't accidentally rewritten.
      if (index % 2 === 1) return segment;

      return segment.replaceAll(
        ROOT_RELATIVE_LINK_RE,
        (_match, path: string, titleSuffix: string) =>
          `](${siteUrl}${path}${titleSuffix})`,
      );
    })
    .join('');
}

function absolutizeFrontmatter(frontmatter: string, siteUrl: string): string {
  // Match `image:` lines whose value is a root-relative path in single or
  // double quotes. We deliberately avoid touching arbitrary string fields to
  // limit blast radius. If more fields ever need rewriting, list them here.
  return frontmatter.replaceAll(
    /^(image:\s*)(['"])(\/[^'"]+)\2/gm,
    (_match, prefix: string, quote: string, value: string) =>
      `${prefix}${quote}${siteUrl}${value}${quote}`,
  );
}

export function absolutizeMarkdownLinks(raw: string, siteUrl: string): string {
  // Strip a trailing slash from siteUrl so concatenation with `/path` doesn't
  // produce `//path`.
  const normalizedSiteUrl = siteUrl.replace(/\/$/, '');

  // Detect a frontmatter block at the very top of the file: a line consisting
  // of `---`, content, then another line of `---`.
  const frontmatterMatch = raw.match(/^(---\n)([\s\S]*?\n)(---\n)([\s\S]*)$/);
  if (!frontmatterMatch) {
    return absolutizeBody(raw, normalizedSiteUrl);
  }

  const [, openFence, frontmatter, closeFence, body] = frontmatterMatch;

  return (
    openFence +
    absolutizeFrontmatter(frontmatter, normalizedSiteUrl) +
    closeFence +
    absolutizeBody(body, normalizedSiteUrl)
  );
}
