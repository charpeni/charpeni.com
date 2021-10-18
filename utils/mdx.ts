import fs from 'fs';
import matter from 'gray-matter';
import mdxPrism from 'mdx-prism';
import path from 'path';
import readingTime from 'reading-time';
import renderToString from 'next-mdx-remote/render-to-string';
import remarkAutolinkHeadings from 'remark-autolink-headings';
import remarkSlug from 'remark-slug';
import remarkCodeTitles from 'remark-code-titles';
import { getPlaiceholder } from 'plaiceholder';

import MDXComponents from '@/components/MDXComponents';

const root = process.cwd();

function parsePost(source: string) {
  return matter(source);
}

export async function getPosts() {
  return fs.readdirSync(path.join(root, 'posts'));
}

export async function getPostBySlug(slug) {
  const source = fs.readFileSync(
    path.join(root, 'posts', `${slug}.mdx`),
    'utf8',
  );

  const { data, content } = matter(source);
  const mdxSource = await renderToString(content, {
    components: MDXComponents,
    mdxOptions: {
      remarkPlugins: [remarkAutolinkHeadings, remarkSlug, remarkCodeTitles],
      rehypePlugins: [mdxPrism],
    },
  });

  return {
    mdxSource,
    frontMatter: {
      wordCount: content.split(/\s+/gu).length,
      readingTime: readingTime(content),
      slug: slug || null,
      ...data,
    },
  };
}

export async function getAllPostsFrontMatter() {
  // TODO: This should be using getPosts
  const files = fs.readdirSync(path.join(root, 'posts'));

  return Promise.all(
    files.map(async (postSlug) => {
      // TODO: This should be using getPostFrontMatter()
      const source = fs.readFileSync(
        path.join(root, 'posts', postSlug),
        'utf8',
      );
      const { data } = await parsePost(source);
      const { base64 } = await getPlaiceholder(data.image);

      return {
        ...data,
        blurDataURL: base64,
        slug: postSlug.replace('.mdx', ''),
      };
    }),
  );
}
