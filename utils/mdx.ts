import fs from 'fs';
import matter from 'gray-matter';
import mdxPrism from 'mdx-prism';
import path from 'path';
import readingTime from 'reading-time';
import { serialize } from 'next-mdx-remote/serialize';
import rehypeCodeTitles from 'rehype-code-titles';
import { remarkAlert } from 'remark-github-blockquote-alert';
import { getPlaiceholder } from 'plaiceholder';

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
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore-error - https://github.com/orgs/rehypejs/discussions/63
      remarkPlugins: [remarkAlert],
      rehypePlugins: [rehypeCodeTitles, mdxPrism],
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
