import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import cloudflare from '@astrojs/cloudflare';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

import {
  rehypePlugins,
  remarkPreserveCodeMeta,
} from './src/lib/mdxPipeline.ts';

/**
 * slug → ISO lastmod map from each post's frontmatter (`updatedAt` wins over
 * `publishedAt`), so the sitemap emits a meaningful <lastmod> per blog URL
 * instead of the build timestamp. The homepage mirrors the newest post so the
 * sitemap doesn't lie about content changes on every build. Port of the old
 * next-sitemap.config.js.
 */
function buildLastmodMap() {
  const postsDir = fileURLToPath(new URL('./posts', import.meta.url));
  const map = new Map();
  let mostRecent = null;
  for (const file of fs.readdirSync(postsDir)) {
    if (!file.endsWith('.mdx')) continue;
    const source = fs.readFileSync(path.join(postsDir, file), 'utf8');
    const date = (field) =>
      source.match(
        new RegExp(`^${field}:\\s*['"]?([^'"\n]+?)['"]?$`, 'm'),
      )?.[1];
    const dateString = date('updatedAt') ?? date('publishedAt');
    if (!dateString) continue;
    const iso = new Date(dateString).toISOString();
    map.set(`/blog/${file.replace(/\.mdx$/, '')}`, iso);
    if (!mostRecent || iso > mostRecent) mostRecent = iso;
  }
  if (mostRecent) map.set('/', mostRecent);
  return map;
}

const lastmodByPath = buildLastmodMap();

/**
 * Precomputed image metadata + responsive variants. Runs here — in Node, at
 * config load — because the Cloudflare adapter prerenders pages inside
 * workerd, where node:fs and sharp do not exist. Per referenced image:
 * - byte size + MIME (RSS enclosures)
 * - plaiceholder blur placeholder (banner blur-up)
 * - WebP variants at responsive widths, written to public/_opt (gitignored)
 *   so published /static/images URLs (og:image, RSS, old links) never move —
 *   pages add them as <img srcset>, replacing what next/image used to do.
 * Cached by file size+mtime; sharp only runs for new/changed images.
 */
async function buildImageMeta() {
  const sharp = (await import('sharp')).default;
  const { getPlaiceholder } = await import('plaiceholder');
  const postsDir = fileURLToPath(new URL('./posts', import.meta.url));
  const publicDir = fileURLToPath(new URL('./public', import.meta.url));
  const outFile = fileURLToPath(
    new URL('./src/generated/imageMeta.json', import.meta.url),
  );
  const MIME = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
  };
  const VARIANT_WIDTHS = [384, 640, 828, 1080, 1200, 1600];
  // Animated GIFs (and SVGs) are served as-is; resizing them is expensive
  // and next/image effectively passed them through too.
  const VARIANT_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp']);

  // Collect every referenced image: frontmatter banners (also get blur
  // placeholders), in-body /static/images refs, and the hero avatar.
  const banners = new Set();
  const referenced = new Set(['/static/images/nicolas_charpentier.jpeg']);
  for (const file of fs.readdirSync(postsDir)) {
    if (!file.endsWith('.mdx')) continue;
    const source = fs.readFileSync(path.join(postsDir, file), 'utf8');
    const banner = source.match(/^image:\s*['"]?([^'"\n]+?)['"]?$/m)?.[1];
    if (banner) {
      banners.add(banner);
      referenced.add(banner);
    }
    for (const match of source.matchAll(
      /\/static\/images\/[^\s'"`)}>]+\.(?:png|jpe?g|gif|webp)/g,
    )) {
      referenced.add(match[0]);
    }
  }

  let previous = {};
  try {
    previous = JSON.parse(fs.readFileSync(outFile, 'utf8'));
  } catch {
    // First run or corrupt cache — rebuild everything.
  }

  const meta = {};
  for (const image of referenced) {
    const filePath = path.join(publicDir, image);
    if (!fs.existsSync(filePath)) continue;
    const stat = fs.statSync(filePath);
    const stamp = `${stat.size}:${Math.round(stat.mtimeMs)}`;
    const ext = image.slice(image.lastIndexOf('.')).toLowerCase();
    const cached = previous[image];
    // Reuse only when the source is unchanged AND the entry actually has
    // its variants (guards against pre-variant cache entries) AND every
    // variant file still exists on disk.
    const cachedComplete =
      !VARIANT_EXTS.has(ext) ||
      ((cached?.variants?.length ?? 0) > 0 &&
        cached.variants.every((v) =>
          fs.existsSync(path.join(publicDir, ...v.path.split('/'))),
        ));
    if (cached?.stamp === stamp && cachedComplete) {
      meta[image] = cached;
      continue;
    }

    const buffer = fs.readFileSync(filePath);
    const entry = {
      stamp,
      size: stat.size,
      mimeType: MIME[ext] ?? 'image/png',
      variants: [],
    };
    if (VARIANT_EXTS.has(ext)) {
      const { width, height } = await sharp(buffer).metadata();
      entry.width = width;
      entry.height = height;
      const widths = [
        ...VARIANT_WIDTHS.filter((w) => w < width),
        Math.min(width, 1600),
      ];
      for (const w of [...new Set(widths)].toSorted((a, b) => a - b)) {
        // Dot-separated suffix — '@' (or other reserved chars) in asset
        // paths triggers workerd's URL normalization (307 to the
        // percent-encoded form) on every request.
        const variantPath = `/_opt${image.replace(/\.[^.]+$/, '')}.${w}.webp`;
        const outPath = path.join(publicDir, ...variantPath.split('/'));
        fs.mkdirSync(path.dirname(outPath), { recursive: true });
        await sharp(buffer)
          .resize({ width: w })
          .webp({ quality: 80 })
          .toFile(outPath);
        entry.variants.push({ w, path: variantPath });
      }
    }
    if (banners.has(image)) {
      const { base64 } = await getPlaiceholder(buffer, { size: 20 });
      entry.blurDataURL = base64;
    }
    meta[image] = entry;
  }
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, `${JSON.stringify(meta, null, 2)}\n`);
}

await buildImageMeta();

// https://astro.build/config
export default defineConfig({
  site: 'https://charpeni.com',
  // Match the site's historical URL shape: no trailing slashes, and
  // directory-format output (blog/foo/index.html served at /blog/foo).
  // 'directory' is pinned explicitly — the Vercel adapter used to force it
  // silently, and Cloudflare's html_handling serves either shape, so without
  // the pin a config drift would reshape every URL's backing file.
  trailingSlash: 'never',
  build: { format: 'directory' },
  // Everything prerenders to static files except /api/latestPrs, which
  // opts out per-route (it proxies a feed at runtime, cached via the
  // Workers Cache API). The site uses no astro:assets (plain <img> from
  // public/) and no sessions — passthrough/false keep the generated
  // wrangler config free of IMAGES/KV bindings that would need
  // provisioning at deploy.
  adapter: cloudflare({ imageService: 'passthrough' }),
  session: false,
  redirects: {
    // Ported from next.config.js redirects().
    '/blog/enforce-best-practices-incrementally':
      '/blog/enforce-best-practices-incrementally-with-betterer',
    '/blog': '/',
    // next-sitemap emitted /sitemap.xml; @astrojs/sitemap emits
    // /sitemap-index.xml — keep the URL registered in search consoles alive.
    '/sitemap.xml': '/sitemap-index.xml',
  },
  integrations: [
    mdx(),
    // Page partials (/blog/[slug]/content, /partials/*) are window-content
    // channels for the terminal, not documents — keep them out of the
    // sitemap (robots.txt disallows them too). The legal pages are noindex
    // at the page level, so they're omitted here to keep both signals
    // consistent (next-sitemap.config.js parity).
    sitemap({
      filter: (page) =>
        !page.includes('/partials/') &&
        !/\/blog\/[^/]+\/content/.test(page) &&
        !page.includes('/disclaimer') &&
        !page.includes('/privacy-policy'),
      serialize: (item) => {
        const pathname = new URL(item.url).pathname;
        // Priority is a relative crawl-budget hint: homepage > posts > rest.
        let priority = 0.7;
        if (pathname === '/') priority = 1;
        else if (pathname.startsWith('/blog/')) priority = 0.8;
        return {
          ...item,
          lastmod: lastmodByPath.get(pathname) ?? new Date().toISOString(),
          changefreq: pathname.startsWith('/blog/') ? 'monthly' : 'weekly',
          priority,
        };
      },
    }),
    // React powers islands only: the terminal window manager and Sandpack.
    // Content never depends on it.
    react(),
  ],
  markdown: {
    // The site predates Astro's built-in highlighting and has a bespoke
    // Shiki setup (dual theme + Twoslash + three custom transformers, ported
    // verbatim from the Next.js utils/mdx.ts) — disable the built-in and
    // run the full custom rehype chain instead.
    syntaxHighlight: false,
    // The Next.js pipeline (utils/mdx.ts) ran no remark plugins, so GFM
    // extensions (bare-URL autolinking, tables, strikethrough) and SmartyPants
    // curly-quote/dash substitution were both OFF. Astro enables both by
    // default; leaving them on silently rewrites every already-published
    // post's rendered output (straight → curly quotes, etc.). Pin them off to
    // keep 1:1 parity with the old rendered HTML.
    gfm: false,
    smartypants: false,
    remarkPlugins: [remarkPreserveCodeMeta],
    rehypePlugins,
  },
  vite: {
    plugins: [tailwindcss()],
    // Pre-bundle the passthrough image service: on a cold cache Vite
    // discovers it mid-boot and triggers a reload the Cloudflare dev
    // runner doesn't survive.
    optimizeDeps: { include: ['astro/assets/services/noop'] },
    server: {
      // Extra hostnames for reverse-proxied dev setups, comma-separated
      // (e.g. DEV_ALLOWED_HOSTS=dev.example.local pnpm dev).
      allowedHosts: process.env.DEV_ALLOWED_HOSTS?.split(',') ?? [],
    },
  },
});
