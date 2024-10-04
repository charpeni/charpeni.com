import fs from 'fs';
import matter from 'gray-matter';
import mdxPrism from 'mdx-prism';
import path from 'path';
import readingTime from 'reading-time';
import { serialize } from 'next-mdx-remote/serialize';
import rehypeCodeTitles from 'rehype-code-titles';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeSlug from 'rehype-slug';
import { getPlaiceholder } from 'plaiceholder';
import { fromHtmlIsomorphic } from 'hast-util-from-html-isomorphic';
import rehypeCallouts from 'rehype-callouts';

import type { ReadTimeResults } from 'reading-time';
import type { MDXRemoteSerializeResult } from 'next-mdx-remote';

type PostFrontMatter = {
  title: string;
  publishedAt: string;
  summary: string;
  image: string;
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
  const { base64 } = await getPlaiceholder(data.image, { size: 20 });
  const mdxSource = await serialize(content, {
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
        mdxPrism,
      ],
    },
  });

  return {
    mdxSource,
    frontMatter: {
      slug: slug || null,
      title: data.title,
      publishedAt: data.publishedAt,
      summary: data.summary,
      image: data.image,
      blurDataURL: base64,
      wordCount: content.split(/\s+/gu).length,
      readingTime: readingTime(content),
    },
  };
}

export async function getAllPostsFrontMatter() {
  const files = getPosts();

  return Promise.all(
    files.map(async (file) => getPostBySlug(file.replace('.mdx', ''))),
  ).then((posts) =>
    posts
      .map((post) => post.frontMatter)
      .sort(
        (a, b) =>
          Number(new Date(b.publishedAt)) - Number(new Date(a.publishedAt)),
      ),
  );
}
