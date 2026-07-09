import Link from 'next/link';

import Container from '@/components/Container';
import { getAllPostsFrontMatter } from '@/utils/mdx';

export default function NotFound() {
  return (
    <Container
      title="404 — Page Not Found"
      description="The requested page could not be found."
      noIndex
    >
      <section className="mx-auto flex min-h-[60vh] w-full max-w-4xl flex-col justify-center py-20">
        <p className="mb-3 font-mono text-sm text-gray-500 dark:text-gray-400">
          error: 404
        </p>
        <h1 className="mb-5 text-4xl font-bold tracking-tight text-black dark:text-white md:text-6xl">
          This page wandered off.
        </h1>
        <p className="mb-8 max-w-xl text-lg leading-8 text-gray-600 dark:text-gray-400">
          The address may be outdated, or the page may have moved somewhere else
          in the archive.
        </p>
        <Link
          href="/"
          className="w-fit border-b border-blue-600 pb-1 font-mono text-sm text-blue-600 transition-colors hover:border-black hover:text-black dark:border-blue-400 dark:text-blue-400 dark:hover:border-white dark:hover:text-white"
        >
          ← return to the blog
        </Link>
      </section>
    </Container>
  );
}

export function getStaticProps() {
  return {
    props: {
      retroNotFound: true,
      retroPosts: getAllPostsFrontMatter(),
    },
  };
}
