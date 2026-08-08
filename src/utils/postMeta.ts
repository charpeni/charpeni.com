import readingTime from 'reading-time';

import imageMeta from '@/generated/imageMeta.json';

import type { CollectionEntry } from 'astro:content';

// Generated OG cards on disk (scripts/generateOgImages). Lazy glob: only the
// key set is consulted, no file is ever loaded — an existence check that,
// unlike fs.existsSync, also works in the Cloudflare prerender sandbox.
const OG_CARDS = import.meta.glob('/public/static/images/*/og.png');

type ImageMeta = Record<
  string,
  {
    size: number;
    mimeType: string;
    blurDataURL?: string;
    width?: number;
    height?: number;
    variants?: { w: number; path: string }[];
  }
>;

export const SITE_URL = 'https://charpeni.com';

export type Post = CollectionEntry<'posts'>;

/**
 * Computed post metadata — the fields the old utils/mdx.ts injected into
 * frontmatter at build time, now derived on demand. Uses the same
 * `reading-time` package so displayed "X min read" strings stay identical.
 */
export function getReadingStats(body: string) {
  return {
    wordCount: body.split(/\s+/g).length,
    readingTime: readingTime(body),
  };
}

export function sortByPublishedAt(posts: Post[]) {
  return posts.toSorted(
    (a, b) =>
      Number(new Date(b.data.publishedAt)) -
      Number(new Date(a.data.publishedAt)),
  );
}

/**
 * Social-preview image resolution, in the same priority order as the old
 * BlogLayout: custom banner (`image`) → generated per-post OG card
 * (public/static/images/<slug>/og.png, produced by scripts/generateOgImages)
 * → sitewide default (handled by the layout).
 */
export function getOgImagePath(post: Post): string | undefined {
  if (post.data.image) return post.data.image;
  const ogImageRelative = `/static/images/${post.id}/og.png`;
  if (`/public${ogImageRelative}` in OG_CARDS) {
    return ogImageRelative;
  }
  return undefined;
}

/**
 * Base64 blur placeholder for the banner (parity with the old
 * `blurDataURL`); rendered as a background under the banner <img> so the
 * blur-up behavior survives without next/image. Precomputed at config load
 * (astro.config.mjs buildImageMeta) — plaiceholder needs sharp, which can't
 * run in the Cloudflare prerender sandbox.
 */
export function getBlurDataURL(image: string | undefined): string | undefined {
  if (!image) return undefined;
  return (imageMeta as ImageMeta)[image]?.blurDataURL;
}

/** Banner byte size + MIME type for RSS enclosures (same generated map). */
export function getImageMeta(
  image: string,
): { size: number; mimeType: string } | undefined {
  const entry = (imageMeta as ImageMeta)[image];
  return entry ? { size: entry.size, mimeType: entry.mimeType } : undefined;
}

/**
 * WebP srcset for a /static/images asset (variants generated at config
 * load under /_opt — the original URL stays canonical). Undefined for
 * unoptimized formats (gif/svg) and unknown images, in which case callers
 * render the plain original.
 */
export function getResponsiveImage(
  image: string,
): { srcset: string; width: number; height: number } | undefined {
  const entry = (imageMeta as ImageMeta)[image];
  if (!entry?.variants?.length || !entry.width || !entry.height) {
    return undefined;
  }
  return {
    srcset: entry.variants.map((v) => `${v.path} ${v.w}w`).join(', '),
    width: entry.width,
    height: entry.height,
  };
}
