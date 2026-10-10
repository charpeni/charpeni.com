import { handle } from '@astrojs/cloudflare/handler';

// Relative import on purpose: tests/acceptHeader.test.mjs imports the same
// module through Node's type stripping, which resolves no `@/` aliases.
import { preferredFormat } from './utils/acceptHeader';

/**
 * Custom worker entry — the adapter default is exactly `{ fetch: handle }`;
 * this wraps it with `Accept: text/markdown` content negotiation
 * (acceptmarkdown.com) on the canonical HTML URLs, plus a markdown 404 for
 * markdown-preferring agents. Wired up via `main` in wrangler.jsonc; only
 * the paths listed in assets.run_worker_first reach this worker before the
 * static asset layer, so every other URL keeps its zero-invocation serving.
 */

// Minimal structural types: @cloudflare/workers-types isn't a dependency of
// this repo, and handle()'s ambient parameter types are ignored under
// skipLibCheck anyway.
type Env = {
  ASSETS: { fetch(input: Request | URL | string): Promise<Response> };
};
type Ctx = {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
};

// Every post slug is kebab-case; anything else on /blog/ (dots, nested
// segments, trailing slash) is a single-representation asset or a redirect
// and must not negotiate.
const BLOG_SLUG_RE = /^\/blog\/[a-z0-9-]+$/;

function markdownPathFor(pathname: string): string | undefined {
  if (pathname === '/') return '/index.md';
  if (BLOG_SLUG_RE.test(pathname)) return `${pathname}.md`;
  return undefined;
}

function notFoundMarkdown(origin: string): string {
  return `# 404 — Page Not Found

Nothing lives at this URL. Useful places to look instead:

- [Homepage](${origin}/) — markdown at [/index.md](${origin}/index.md)
- [llms.txt](${origin}/llms.txt) — index of every post with summaries and markdown URLs
- [llms-full.txt](${origin}/llms-full.txt) — every post in a single file
- [Sitemap](${origin}/sitemap-index.xml)
- [RSS feed](${origin}/blog/rss.xml)

Blog posts live at \`/blog/{slug}\` (markdown at \`/blog/{slug}.md\`).
`;
}

// Responses from handle()/ASSETS.fetch can carry immutable headers — always
// re-wrap before mutating.
function withHeaders(
  response: Response,
  mutate: (headers: Headers) => void,
): Response {
  const out = new Response(response.body, response);
  mutate(out.headers);
  return out;
}

function addVary(headers: Headers): void {
  if (!/\baccept\b/i.test(headers.get('Vary') ?? '')) {
    headers.append('Vary', 'Accept');
  }
}

// Synthesized responses (406, markdown 404) bypass the asset layer, so
// _headers rules don't apply — they carry their own headers.
function markdownNotFound(method: string, origin: string): Response {
  return new Response(method === 'HEAD' ? null : notFoundMarkdown(origin), {
    status: 404,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      Vary: 'Accept',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function notAcceptable(
  method: string,
  origin: string,
  pathname: string,
  markdownPath: string,
): Response {
  const body = `406 Not Acceptable

Available representations:

- text/html: ${origin}${pathname}
- text/markdown: ${origin}${markdownPath}
`;
  return new Response(method === 'HEAD' ? null : body, {
    status: 406,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      Vary: 'Accept',
    },
  });
}

const worker = {
  async fetch(request: Request, env: Env, ctx: Ctx): Promise<Response> {
    const url = new URL(request.url);

    // run_worker_first bypasses the asset front door — which is what issues
    // the html_handling drop-trailing-slash redirect (the ASSETS binding
    // serves the file without redirecting). Replicate it here so /blog/foo/
    // keeps canonicalizing to /blog/foo, the site's historical URL shape.
    if (url.pathname !== '/' && url.pathname.endsWith('/')) {
      const canonical = new URL(url);
      canonical.pathname = url.pathname.replace(/\/+$/, '');
      return Response.redirect(canonical.toString(), 307);
    }

    const negotiable = request.method === 'GET' || request.method === 'HEAD';
    const markdownPath = negotiable ? markdownPathFor(url.pathname) : undefined;
    const format = negotiable
      ? preferredFormat(request.headers.get('Accept'))
      : 'html';

    if (markdownPath) {
      if (format === 'none') {
        return notAcceptable(
          request.method,
          url.origin,
          url.pathname,
          markdownPath,
        );
      }

      if (format === 'markdown') {
        // Forward the original method and headers so the asset layer serves
        // HEAD and If-None-Match → 304 correctly, and _headers still applies.
        const markdownRequest = new Request(
          new URL(markdownPath, url.origin),
          request,
        );
        // No asset layer in plain astro dev — fall through to the app there
        // (and for unknown slugs, whose 404 the app also renders).
        const asset = await env.ASSETS.fetch(markdownRequest).catch(
          () => undefined,
        );
        const response: Response =
          !asset || asset.status === 404
            ? await handle(markdownRequest, env, ctx)
            : asset;
        if (response.status === 404) {
          return markdownNotFound(request.method, url.origin);
        }
        const { status } = response;
        return withHeaders(response, (headers) => {
          if (status !== 304) {
            headers.set('Content-Type', 'text/markdown; charset=utf-8');
          }
          addVary(headers);
        });
      }

      return withHeaders(await handle(request, env, ctx), addVary);
    }

    // Everything else behaves exactly like the default entry, except that
    // markdown-preferring agents get a markdown 404 they can navigate.
    const response = await handle(request, env, ctx);
    if (response.status === 404 && format === 'markdown') {
      return markdownNotFound(request.method, url.origin);
    }
    return response;
  },
};

export default worker;
