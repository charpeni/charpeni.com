import type { InferGetStaticPropsType } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useRef, useState } from 'react';

import BlogPostCard from '@/components/BlogPostCard';
import CompanyName from '@/components/CompanyName';
import Container from '@/components/Container';
import MySocials from '@/components/MySocials';
import styles from '@/styles/GradientAnimation.module.css';
import { BRANCH_TAGS, computeGraph } from '@/utils/graph';
import { getAllPostsFrontMatter } from '@/utils/mdx';

const POSTS_PER_PAGE = 8;

export default function Home({
  posts,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  const router = useRouter();
  const currentPage = Number(router.query.page) || 1;
  const totalPages = Math.ceil(posts.length / POSTS_PER_PAGE);
  const blogHeaderRef = useRef<HTMLHeadingElement>(null);

  const paginatedPosts = posts.slice(
    (currentPage - 1) * POSTS_PER_PAGE,
    currentPage * POSTS_PER_PAGE,
  );

  // Compute series-lane state for the visible page. Cheap and pure;
  // runs on every render but only does meaningful work on inputs that
  // change with `currentPage`.
  const graph = computeGraph(paginatedPosts, posts);

  // Hover state lifted from individual post cards so a hover on one
  // row can highlight the entire git path (lane lines + arcs + orbs)
  // across all sibling rows on the page. Cards report the lanes they
  // own on mouse enter; the matching segments anywhere on the page
  // light up via `highlightedLanes`.
  const [highlightedLanes, setHighlightedLanes] =
    useState<ReadonlySet<string> | null>(null);
  const handleHighlight = useCallback(
    (lanes: ReadonlySet<string> | null) => setHighlightedLanes(lanes),
    [],
  );

  // Update URL when page changes and scroll to blog header
  const setCurrentPage = (page: number) => {
    const query = { ...router.query };
    if (page === 1) {
      delete query.page;
    } else {
      query.page = page.toString();
    }

    router
      .push(
        {
          pathname: router.pathname,
          query,
        },
        undefined,
        { shallow: true },
      )
      .then(() => {
        // Scroll to the blog posts header with smooth behavior
        if (blogHeaderRef.current) {
          blogHeaderRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        }
      });
  };

  // Validate page number
  useEffect(() => {
    if (currentPage < 1) {
      setCurrentPage(1);
    } else if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, totalPages]);

  return (
    <Container
      title="Nicolas Charpentier — Frontend Infrastructure & Developer Tooling"
      description="Software Engineer focused on frontend infrastructure and developer tooling. I write about TypeScript, React, React Native, GraphQL, Apollo Client, CI/CD, and shipping reliable code."
      noIndex={currentPage > 1}
    >
      <div className="flex flex-col justify-center items-start max-w-4xl w-full mx-auto mb-16">
        <section className="w-full mb-8">
          <div className="flex flex-col-reverse lg:flex-row items-center lg:items-start justify-between">
            <div className="flex-1 md:mt-4 lg:mt-0 lg:pr-8 w-full text-center lg:text-left">
              <h1 className="font-bold text-3xl md:text-4xl lg:text-5xl tracking-tight mb-8 text-black dark:text-white lg:whitespace-nowrap">
                👋 Hi, I&apos;m Nicolas Charpentier
              </h1>
              <div className="lg:flex lg:items-start lg:gap-8">
                <div className="flex-1">
                  <p className="prose text-base md:text-xl text-gray-600 dark:text-gray-400 mx-auto lg:mx-0 leading-7">
                    I&apos;m a Software Engineer doing the &quot;backend&quot;
                    work of the frontend: architecture, tooling, and
                    infrastructure. I specialize in{' '}
                    <span className="text-blue-600 dark:text-blue-400 font-medium">
                      TypeScript
                    </span>
                    ,{' '}
                    <span className="text-blue-600 dark:text-blue-400 font-medium">
                      React Native
                    </span>
                    ,{' '}
                    <span className="text-cyan-600 dark:text-cyan-400 font-medium">
                      React
                    </span>
                    ,{' '}
                    <span className="text-pink-600 dark:text-pink-400 font-medium">
                      GraphQL
                    </span>
                    , and{' '}
                    <span className="text-purple-600 dark:text-purple-400 font-medium">
                      CI/CD
                    </span>
                    .
                  </p>
                  <p className="prose text-base md:text-xl mt-4 text-gray-600 dark:text-gray-400 mx-auto lg:mx-0">
                    I&apos;m an{' '}
                    <span className="font-semibold glow-yellow-text">
                      open source enthusiast
                    </span>{' '}
                    who loves removing friction from the developer experience,
                    hunting down performance issues, and sharing what I find
                    along the way.
                  </p>
                  <p className="prose text-base md:text-xl mt-4 text-gray-600 dark:text-gray-400 mx-auto lg:mx-0">
                    Currently working at{' '}
                    <CompanyName
                      className="text-shortcut decoration-shortcut"
                      href="https://shortcut.com"
                    >
                      Shortcut
                    </CompanyName>
                    , on{' '}
                    <CompanyName
                      className="text-korey decoration-korey"
                      href="https://korey.ai"
                    >
                      Korey.ai
                    </CompanyName>
                    .
                  </p>
                  <div className="mt-4 md:mt-8 flex flex-wrap md:flex-nowrap items-center justify-center lg:justify-start gap-2">
                    <MySocials />
                    <span className="hidden md:inline text-sm text-gray-500 dark:text-gray-400">
                      |
                    </span>
                    <a
                      href="https://prs.charpeni.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-gray-500 dark:text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors whitespace-nowrap ml-1"
                    >
                      Check out my latest open source contributions
                    </a>
                  </div>
                </div>
                <div className="hidden lg:block aspect-square w-[200px] relative rounded-full overflow-hidden flex-shrink-0 shadow-[0_0_20px_rgba(59,130,246,0.3),0_0_40px_rgba(147,51,234,0.2),0_0_60px_rgba(236,72,153,0.15)]">
                  <div
                    className={`absolute -inset-[6px] ${styles.gradientRotate}`}
                  />
                  <div className="absolute inset-[3px] bg-gray-50 dark:bg-gray-900 rounded-full overflow-hidden">
                    <Image
                      src="/static/images/nicolas_charpentier.jpeg"
                      alt="Nicolas Charpentier"
                      fill
                      sizes="194px"
                      priority
                      className="object-cover rounded-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full">
          <div
            ref={blogHeaderRef}
            id="blog-posts"
            className="mb-10 border-b border-gray-200 dark:border-gray-800 pb-4"
          >
            <h2 className="font-bold text-3xl md:text-4xl tracking-tight text-black dark:text-white">
              Blog Posts
            </h2>
          </div>

          <div
            className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-gray-500 dark:text-gray-500"
            aria-label="Branches"
          >
            <span className="text-gray-400 dark:text-gray-600">branches:</span>
            {BRANCH_TAGS.map((branch) => (
              <Link
                key={branch}
                href={`/tags/${branch}`}
                className="inline-flex items-center gap-1 transition-colors hover:text-blue-600 dark:hover:text-blue-400"
              >
                <span
                  aria-hidden="true"
                  className="inline-block w-2 h-2 rounded-full border border-gray-400 dark:border-gray-500"
                />
                {branch}
              </Link>
            ))}
          </div>

          <div className="flex flex-col">
            {paginatedPosts.map((post, index) => (
              <BlogPostCard
                key={post.slug}
                {...post}
                graph={graph.rows[index]}
                isHead={currentPage === 1 && index === 0}
                activeBranches={graph.activeBranches}
                highlightedLanes={highlightedLanes}
                onHighlight={handleHighlight}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <nav
              className="mt-8 flex items-center justify-between gap-4 border-t border-gray-200 dark:border-gray-800 pt-6 font-mono text-sm"
              aria-label="Pagination"
            >
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center gap-1.5 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-gray-600 dark:disabled:hover:text-gray-400 transition-colors"
              >
                <span aria-hidden="true">←</span>
                <span>newer</span>
              </button>

              <span className="text-gray-500 dark:text-gray-500 tabular-nums">
                page {currentPage} / {totalPages}
              </span>

              <button
                onClick={() =>
                  setCurrentPage(Math.min(totalPages, currentPage + 1))
                }
                disabled={currentPage === totalPages}
                className="inline-flex items-center gap-1.5 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-gray-600 dark:disabled:hover:text-gray-400 transition-colors"
              >
                <span>older</span>
                <span aria-hidden="true">→</span>
              </button>
            </nav>
          )}
        </section>
      </div>
    </Container>
  );
}

export async function getStaticProps() {
  const posts = getAllPostsFrontMatter();
  return { props: { posts, retroPosts: posts } };
}
