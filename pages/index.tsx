import type { InferGetStaticPropsType } from 'next';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useEffect, useRef } from 'react';

import BlogPostCard from '@/components/BlogPostCard';
import CompanyName from '@/components/CompanyName';
import Container from '@/components/Container';
import MySocials from '@/components/MySocials';
import styles from '@/styles/GradientAnimation.module.css';
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
    <Container>
      <div className="flex flex-col justify-center items-start max-w-4xl w-full mx-auto mb-16">
        <section className="w-full mb-8 md:mb-16">
          <div className="flex flex-col-reverse lg:flex-row items-center lg:items-start justify-between">
            <div className="flex-1 md:mt-4 lg:mt-0 lg:pr-8 w-full text-center lg:text-left">
              <h1 className="font-bold text-3xl md:text-4xl lg:text-5xl tracking-tight mb-8 text-black dark:text-white lg:whitespace-nowrap">
                👋 Hi, I&apos;m Nicolas Charpentier
              </h1>
              <div className="lg:flex lg:items-start lg:gap-8">
                <div className="flex-1">
                  <h2 className="prose text-base md:text-xl text-gray-600 dark:text-gray-400 mx-auto lg:mx-0 leading-7">
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
                  </h2>
                  <p className="prose text-base md:text-xl mt-4 text-gray-600 dark:text-gray-400 mx-auto lg:mx-0">
                    I&apos;m an{' '}
                    <span className="font-semibold glow-yellow-text">
                      open source enthusiast
                    </span>{' '}
                    who loves removing friction from the developer experience
                    and hunting down performance issues.
                  </p>
                  <p className="prose text-base md:text-xl mt-4 text-gray-600 dark:text-gray-400 mx-auto lg:mx-0">
                    Currently working at{' '}
                    <CompanyName className="decoration-shortcut">
                      Shortcut
                    </CompanyName>
                    .
                  </p>
                  <div className="mt-4 md:mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-2">
                    <MySocials />
                    <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">|</span>
                    <a
                      href="https://prs.charpeni.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-gray-500 dark:text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors"
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

        <p className="w-full mb-2 text-center text-base text-gray-500 dark:text-gray-500 italic">
          Sharing knowledge is part of removing friction, so here are my latest
          findings:
        </p>

        <section className="w-full">
          <h2
            ref={blogHeaderRef}
            id="blog-posts"
            className="font-bold text-3xl md:text-4xl tracking-tight mb-8 text-black dark:text-white"
          >
            Blog Posts
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {paginatedPosts.map((post, index) => (
              <BlogPostCard
                key={post.slug}
                {...post}
                priority={currentPage === 1 && index === 0}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-12 flex justify-center items-center">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Previous page"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <div className="flex items-center">
                {Array.from({ length: totalPages }).map((_, i) => {
                  const colors = [
                    'bg-blue-600 dark:bg-blue-400',
                    'bg-emerald-600 dark:bg-emerald-400',
                    'bg-purple-600 dark:bg-purple-400',
                    'bg-amber-600 dark:bg-amber-400',
                    'bg-rose-600 dark:bg-rose-400',
                    'bg-cyan-600 dark:bg-cyan-400',
                    'bg-indigo-600 dark:bg-indigo-400',
                    'bg-pink-600 dark:bg-pink-400',
                  ];
                  const dotColor =
                    i < currentPage
                      ? colors[i % colors.length]
                      : 'bg-gray-300 dark:bg-gray-600';
                  const lineColor =
                    i < currentPage
                      ? colors[(i - 1) % colors.length]
                      : 'bg-gray-300 dark:bg-gray-600';

                  return (
                    <div key={i + 1} className="flex items-center">
                      {i > 0 && (
                        <div
                          className={`h-[2px] w-8 transition-colors duration-200 ${lineColor}`}
                        />
                      )}
                      <button
                        onClick={() => setCurrentPage(i + 1)}
                        className={`relative w-8 h-8 flex items-center justify-center transition-all duration-200 ${
                          currentPage === i + 1
                            ? 'scale-125'
                            : i + 1 < currentPage
                              ? 'scale-75'
                              : 'hover:scale-110'
                        }`}
                        aria-label={`Page ${i + 1}`}
                        aria-current={
                          currentPage === i + 1 ? 'page' : undefined
                        }
                      >
                        <div
                          className={`absolute w-8 h-8 rounded-full transition-colors duration-200 ${dotColor} ${
                            i + 1 > currentPage ? 'hover:opacity-80' : ''
                          }`}
                        />
                        <span
                          className={`relative text-xs font-medium z-10 text-white ${
                            i + 1 < currentPage ? 'text-[0.6rem]' : ''
                          }`}
                        >
                          {i + 1}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
              <button
                onClick={() =>
                  setCurrentPage(Math.min(totalPages, currentPage + 1))
                }
                disabled={currentPage === totalPages}
                className="p-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Next page"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
          )}
        </section>
      </div>
    </Container>
  );
}

export async function getStaticProps() {
  const posts = await getAllPostsFrontMatter();

  return { props: { posts } };
}
