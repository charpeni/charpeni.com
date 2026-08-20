import type { APIRoute } from 'astro';

/**
 * robots.txt — previously emitted by next-sitemap (generateRobotsTxt). Kept
 * minimal and standard: no `Host:` directive (non-standard, Google ignores
 * it). The partial routes are window-content channels for the terminal, not
 * documents — disallowed here and X-Robots-Tag'd noindex in _headers.
 */
export const GET: APIRoute = ({ site }) => {
  const sitemap = new URL('/sitemap-index.xml', site ?? 'https://charpeni.com');
  const body = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /partials/',
    'Disallow: /blog/*/content',
    '',
    `Sitemap: ${sitemap.href}`,
    '',
  ].join('\n');
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
