/* eslint-disable unicorn/filename-case */
const fs = require('node:fs');
const path = require('node:path');
const matter = require('gray-matter');

/**
 * Build a slug → ISO date map from each post's frontmatter so the sitemap
 * can emit a meaningful `<lastmod>` per blog URL.
 *
 * Uses `updatedAt` when present; falls back to `publishedAt`. Without this,
 * every URL would receive the build timestamp and search engines couldn't
 * tell which content has actually changed since their last crawl.
 */
function buildLastmodMap() {
  const postsDir = path.join(__dirname, 'posts');
  const files = fs.readdirSync(postsDir).filter((f) => f.endsWith('.mdx'));
  const map = new Map();
  let mostRecent = null;

  for (const file of files) {
    const slug = file.replace(/\.mdx$/, '');
    const source = fs.readFileSync(path.join(postsDir, file), 'utf8');
    const { data } = matter(source);
    const dateString = data.updatedAt || data.publishedAt;
    if (dateString) {
      const iso = new Date(dateString).toISOString();
      map.set(`/blog/${slug}`, iso);
      if (!mostRecent || iso > mostRecent) {
        mostRecent = iso;
      }
    }
  }

  // The homepage's freshness mirrors the most recent post date so the sitemap
  // doesn't lie about content changes on every build.
  if (mostRecent) {
    map.set('/', mostRecent);
  }

  return map;
}

const lastmodByPath = buildLastmodMap();

module.exports = {
  siteUrl: process.env.SITE_URL || 'https://charpeni.com',
  generateRobotsTxt: true,
  // Pages that are `noindex`-ed at the page level should also be omitted from
  // the sitemap to keep both signals consistent.
  exclude: ['/disclaimer', '/privacy-policy'],
  robotsTxtOptions: {
    // Override the default policies to drop the non-standard `Host:` directive
    // (Google ignores it anyway) and keep robots.txt minimal and correct.
    policies: [{ userAgent: '*', allow: '/' }],
  },
  transform: async (config, url) => {
    const pathname = new URL(url, config.siteUrl).pathname;
    const lastmod = lastmodByPath.get(pathname) ?? new Date().toISOString();

    // Higher priority for the homepage and blog posts; lower for everything
    // else. `priority` is relative-only — search engines use it as a hint to
    // pick which URLs to crawl first when budget is limited.
    let priority = 0.7;
    if (pathname === '/') priority = 1;
    else if (pathname.startsWith('/blog/')) priority = 0.8;

    return {
      loc: url,
      lastmod,
      changefreq: pathname.startsWith('/blog/') ? 'monthly' : 'weekly',
      priority,
      alternateRefs: config.alternateRefs ?? [],
    };
  },
};
