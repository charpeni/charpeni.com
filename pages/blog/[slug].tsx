import { MDXRemote } from 'next-mdx-remote';

import { getPosts, getPostBySlug } from '@/utils/mdx';
import BlogLayout from '@/components/BlogLayout';
import MDXComponents from '@/components/MDXComponents';

import type { InferGetStaticPropsType } from 'next';

export default function Blog({
  mdxSource,
  frontMatter,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  return (
    <BlogLayout frontMatter={frontMatter}>
      <MDXRemote {...mdxSource} components={MDXComponents as any} />
    </BlogLayout>
  );
}

export async function getStaticPaths() {
  const posts = getPosts();

  return {
    paths: posts.map((p) => ({
      params: {
        slug: p.replace(/\.mdx/, ''),
      },
    })),
    fallback: false,
  };
}

export async function getStaticProps({ params }) {
  const post = await getPostBySlug(params.slug);

  return { props: { ...post } };
}
