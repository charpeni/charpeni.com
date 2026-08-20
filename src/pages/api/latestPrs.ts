import type { APIRoute } from 'astro';

// Runtime proxy for the PR feed — the one route in the site that is not
// prerendered (astro.config.mjs prerenders everything else). Ported from
// pages/api/latestPrs.ts with identical parsing, response shape, and error
// handling. The shape of each entry is the terminal's `LatestPr`; the type
// is defined here (the endpoint is the source of truth for the wire format)
// so the API route has no dependency on terminal component internals.
export const prerender = false;

export type LatestPr = {
  title: string;
  url: string;
  repo: string;
  number: string;
  publishedAt: string;
};

function decodeXml(text: string) {
  return text
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'");
}

function readTag(item: string, tag: string) {
  const match = new RegExp(
    String.raw`<${tag}>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?</${tag}>`,
  ).exec(item);
  return match ? decodeXml(match[1].trim()) : '';
}

function parsePr(url: string) {
  const match = /^https:\/\/github\.com\/([^/]+\/[^/]+)\/pull\/(\d+)$/.exec(
    url,
  );
  return {
    repo: match?.[1] ?? 'unknown/repo',
    number: match?.[2] ? `#${match[2]}` : '',
  };
}

function parseFeed(xml: string): LatestPr[] {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
    .slice(0, 12)
    .map((match) => {
      const item = match[1];
      const title = readTag(item, 'title');
      const url = readTag(item, 'link');
      const { repo, number } = parsePr(url);
      return {
        title,
        url,
        repo,
        number,
        publishedAt: readTag(item, 'pubDate'),
      };
    });
}

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });
}

export const GET: APIRoute = async ({ request }) => {
  // Cloudflare does not cache Worker responses off `s-maxage` the way
  // Vercel's edge did — without the explicit Cache API round-trip below,
  // every request would hit the prs.charpeni.com origin. The stored
  // response's own s-maxage drives the cache TTL. `caches.default` exists
  // in workerd (and in `astro dev` via the adapter's platform proxy); the
  // guard keeps the route portable to plain Node.
  const cache = (
    globalThis.caches as unknown as { default?: Cache } | undefined
  )?.default;
  const cacheKey = new Request(new URL(request.url).href, { method: 'GET' });
  if (cache) {
    const hit = await cache.match(cacheKey);
    if (hit) return hit;
  }

  let response: Response;
  try {
    response = await fetch('https://prs.charpeni.com/feed.xml');
  } catch {
    return jsonResponse(
      { error: 'Failed to fetch latest PRs' },
      { status: 502 },
    );
  }

  if (!response.ok) {
    return jsonResponse(
      { error: 'Failed to fetch latest PRs' },
      { status: 502 },
    );
  }

  const xml = await response.text();
  const result = jsonResponse(
    { prs: parseFeed(xml) },
    {
      headers: {
        'Cache-Control':
          'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
      },
    },
  );
  if (cache) {
    try {
      await cache.put(cacheKey, result.clone());
    } catch {
      // Cache write failures must never break the response.
    }
  }
  return result;
};
