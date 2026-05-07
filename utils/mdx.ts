import fs from 'node:fs';
import path from 'node:path';

import matter from 'gray-matter';
import { fromHtmlIsomorphic } from 'hast-util-from-html-isomorphic';
import { serialize } from 'next-mdx-remote/serialize';
import { getPlaiceholder } from 'plaiceholder';
import readingTime from 'reading-time';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeCallouts from 'rehype-callouts';
import rehypeCodeTitles from 'rehype-code-titles';
import rehypePrismPlus from 'rehype-prism-plus';
import rehypeSlug from 'rehype-slug';

import type { MDXRemoteSerializeResult } from 'next-mdx-remote';
import type { ReadTimeResults } from 'reading-time';

type PostFrontMatter = {
  title: string;
  publishedAt: string;
  /**
   * Optional ISO date string (or any `new Date()`-parseable form). When set,
   * surfaced as `article:modified_time`, `BlogPosting.dateModified`, and used
   * as the sitemap `<lastmod>` for this URL. Falls back to `publishedAt`.
   * The field is omitted (not set to `undefined`) when absent, so it
   * survives Next.js's `getStaticProps` JSON serialization.
   */
  updatedAt?: string;
  summary: string;
  image: string;
  /**
   * List of topical tags (lowercase kebab-case). Surfaced as `article:tag`
   * meta tags and `BlogPosting.keywords` for SEO. Empty array means
   * untagged. A small whitelist of these tags (see `BRANCH_TAGS` in
   * `utils/graph.ts`) is also used by the homepage commit-log graph
   * to render branches; everything else renders as discovery chips
   * only.
   */
  tags: string[];
  wordCount: number;
  readingTime: ReadTimeResults;
  slug: string;
  blurDataURL: string;
};

type Post = {
  mdxSource: MDXRemoteSerializeResult;
  frontMatter: PostFrontMatter;
};

const root = process.cwd();

export function getPosts() {
  return fs.readdirSync(path.join(root, 'posts'));
}

export async function getPostBySlug(slug: string): Promise<Post> {
  const source = fs.readFileSync(
    path.join(root, 'posts', `${slug}.mdx`),
    'utf8',
  );

  const { data, content } = matter(source);
  const imagePath = path.join(process.cwd(), 'public', data.image);
  const imageBuffer = fs.readFileSync(imagePath);
  const { base64 } = await getPlaiceholder(imageBuffer, { size: 20 });
  const mdxSource = await serialize(content, {
    blockJS: false,
    mdxOptions: {
      remarkPlugins: [],
      rehypePlugins: [
        rehypeSlug,
        [
          rehypeAutolinkHeadings,
          {
            headingProperties: {
              className: ['content-header'],
            },
            content: fromHtmlIsomorphic(
              '<span class="content-header-link"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-link"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></span>',
              { fragment: true },
            ).children,
          },
        ],
        rehypeCodeTitles,
        rehypeCallouts,
        [rehypePrismPlus, { showLineNumbers: true }],
      ],
    },
  });

  const frontMatter: PostFrontMatter = {
    slug,
    title: data.title,
    publishedAt: data.publishedAt,
    summary: data.summary,
    image: data.image,
    tags: Array.isArray(data.tags) ? data.tags : [],
    blurDataURL: base64,
    wordCount: content.split(/\s+/g).length,
    readingTime: readingTime(content),
  };
  // Only set `updatedAt` when present — Next's `getStaticProps` rejects
  // `undefined`, but omitted optional keys serialize cleanly.
  if (data.updatedAt) {
    frontMatter.updatedAt = data.updatedAt;
  }

  return { mdxSource, frontMatter };
}

export async function getAllPostsFrontMatter() {
  const files = getPosts();

  return Promise.all(
    files.map(async (file) => getPostBySlug(file.replace('.mdx', ''))),
  ).then((posts) =>
    posts
      .map((post) => post.frontMatter)
      .toSorted(
        (a, b) =>
          Number(new Date(b.publishedAt)) - Number(new Date(a.publishedAt)),
      ),
  );
}
