import type {
  GetStaticPaths,
  GetStaticProps,
  InferGetStaticPropsType,
} from 'next';
import Link from 'next/link';

import Container from '@/components/Container';
import { getAllPostsFrontMatter } from '@/utils/mdx';
import type { PostMeta } from '@/utils/mdx';

const SITE_URL = 'https://charpeni.com';

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

type TagPost = Pick<
  PostMeta,
  'slug' | 'title' | 'summary' | 'publishedAt' | 'readingTime' | 'tags'
>;

type Props = {
  tag: string;
  posts: TagPost[];
  retroPosts: PostMeta[];
};

export default function TagPage({
  tag,
  posts,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  const title = `#${tag} · Nicolas Charpentier`;
  const description = `Posts tagged ${tag} — ${posts.length} ${
    posts.length === 1 ? 'entry' : 'entries'
  }.`;

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: SITE_URL,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: `#${tag}`,
        item: `${SITE_URL}/tags/${tag}`,
      },
    ],
  };

  return (
    <Container
      title={title}
      description={description}
      structuredData={breadcrumbLd}
    >
      <div className="flex flex-col justify-center items-start max-w-4xl w-full mx-auto mb-16">
        <section className="w-full">
          <nav
            aria-label="Breadcrumb"
            className="font-mono text-xs text-gray-500 dark:text-gray-500 mb-4"
          >
            <Link
              href="/"
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              ← all posts
            </Link>
          </nav>

          <div className="mb-10 border-b border-gray-200 dark:border-gray-800 pb-4">
            <h1 className="font-bold text-3xl md:text-4xl tracking-tight text-black dark:text-white">
              <span className="font-mono text-gray-400 dark:text-gray-600">
                #
              </span>
              {tag}
            </h1>
          </div>

          {posts.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400">
              No posts under this tag yet.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-gray-200 dark:divide-gray-800">
              {posts.map((post) => (
                <li key={post.slug} className="py-5 first:pt-0">
                  <Link
                    href={`/blog/${post.slug}`}
                    className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-sm"
                  >
                    <h2 className="text-lg sm:text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {post.title}
                    </h2>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs text-gray-500 dark:text-gray-400">
                      <time dateTime={post.publishedAt}>
                        {dateFormatter.format(new Date(post.publishedAt))}
                      </time>
                      <span aria-hidden="true">·</span>
                      <span>{post.readingTime.text}</span>
                    </div>
                    <p className="mt-2 text-gray-600 dark:text-gray-400 leading-relaxed">
                      {post.summary}
                    </p>
                  </Link>
                  {post.tags.length > 0 && (
                    <ul
                      className="mt-3 flex flex-wrap gap-2"
                      aria-label="Tags"
                    >
                      {post.tags.map((t) => (
                        <li key={t}>
                          <Link
                            href={`/tags/${t}`}
                            className="inline-block font-mono text-xs text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-800 rounded px-2 py-0.5 hover:text-blue-600 dark:hover:text-blue-400 hover:border-gray-400 dark:hover:border-gray-600 transition-colors"
                          >
                            #{t}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Container>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const posts = await getAllPostsFrontMatter();
  const tags = new Set<string>();
  for (const post of posts) {
    for (const tag of post.tags) tags.add(tag);
  }

  return {
    paths: [...tags].map((tag) => ({ params: { tag } })),
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps<Props> = async ({ params }) => {
  const tag = params?.tag;
  if (typeof tag !== 'string') {
    return { notFound: true };
  }

  const all = await getAllPostsFrontMatter();
  const filtered: TagPost[] = all
    .filter((post) => post.tags.includes(tag))
    .map((post) => ({
      slug: post.slug,
      title: post.title,
      summary: post.summary,
      publishedAt: post.publishedAt,
      readingTime: post.readingTime,
      tags: post.tags,
    }));

  if (filtered.length === 0) {
    return { notFound: true };
  }

  return {
    props: {
      tag,
      posts: filtered,
      retroPosts: all,
    },
  };
};
