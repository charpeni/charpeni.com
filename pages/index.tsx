import Container from '@/components/Container';
import CompanyName from '@/components/CompanyName';
import BlogPostCard from '@/components/BlogPostCard';
import MySocials from '@/components/MySocials';
import { getAllPostsFrontMatter } from '@/utils/mdx';

import type { InferGetStaticPropsType } from 'next';

export default function Home({
  posts,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  return (
    <Container>
      <div className="flex flex-col justify-center items-start max-w-2xl mx-auto mb-16">
        <h1 className="font-bold text-3xl md:text-5xl tracking-tight mb-4 text-black dark:text-white">
          👋 Hi, I&apos;m Nicolas Charpentier
        </h1>
        <div className="max-w-prose">
          <h2 className="prose text-gray-600 dark:text-gray-400">
            I&apos;m a Software Engineer mainly playing with React Native,
            React, GraphQL, and Continuous Integrations (CircleCI, GitHub
            Actions). I&apos;m an{' '}
            <span className="highlight dark:text-white">
              open source enthusiast
            </span>
            , and I enjoy removing friction from the developer experience. I
            often describe myself as someone doing the &quot;backend&quot; work
            of the frontend: frontend architecture and infrastructure. Currently
            working at{' '}
            <CompanyName className="decoration-shortcut">Shortcut</CompanyName>{' '}
            (formerly{' '}
            <CompanyName className="decoration-durple">Clubhouse</CompanyName>
            ).
          </h2>

          <div className="flex justify-end w-full mt-4 lg:mt-0 mb-8">
            <MySocials />
          </div>
        </div>

        <h3 className="font-bold text-2xl md:text-4xl tracking-tight mb-8 text-black dark:text-white">
          Blog Posts
        </h3>
        {posts.map((post) => (
          <BlogPostCard key={post.slug} {...post} />
        ))}
      </div>
    </Container>
  );
}

export async function getStaticProps() {
  const posts = await getAllPostsFrontMatter();

  return { props: { posts } };
}
