import { InferGetStaticPropsType } from 'next';
import hydrate from 'next-mdx-remote/hydrate';

import { getPosts, getPostBySlug } from '@/utils/mdx';
import BlogLayout from '@/components/BlogLayout';
import MDXComponents from '@/components/MDXComponents';

export default function Blog({
  mdxSource,
  frontMatter,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  const content = hydrate(mdxSource, {
    components: {
      ...MDXComponents,
    },
  });

  return <BlogLayout frontMatter={frontMatter}>{content}</BlogLayout>;
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
