import Head from 'next/head';
import { useRouter } from 'next/router';
import type { PropsWithChildren } from 'react';

import Footer from '@/components/Footer';
import Header from '@/components/Header';

const SITE_URL = 'https://charpeni.com';
const DEFAULT_OG_IMAGE = `${SITE_URL}/static/images/og-default.png`;

type Props = {
  date?: string;
  /**
   * ISO date for `article:modified_time`. When set, indicates the page was
   * updated after `date` and tells consumers (Google, Facebook, etc.) to
   * prefer this freshness signal over the published date.
   */
  updatedAt?: string;
  description?: string;
  image?: string;
  title?: string;
  type?: 'website' | 'article';
  noIndex?: boolean;
  /**
   * Optional list of topical tags. Each is emitted as an `article:tag` meta
   * tag (Open Graph). Used together with the JSON-LD `keywords` field, which
   * is set on the page-specific `BlogPosting` (see `BlogLayout.tsx`).
   */
  tags?: string[];
  /**
   * Optional JSON-LD payload(s) merged into the page head alongside the
   * sitewide WebSite + Person structured data emitted from this component.
   */
  structuredData?: Record<string, unknown> | Array<Record<string, unknown>>;
  /**
   * Optional URL to a Markdown representation of this page. Emitted as a
   * `<link rel="alternate" type="text/markdown">` so LLM crawlers and tools
   * can discover the clean source without parsing rendered HTML.
   */
  markdownUrl?: string;
};

export default function Container(props: PropsWithChildren<Props>) {
  const {
    children,
    markdownUrl,
    noIndex,
    structuredData,
    tags,
    updatedAt,
    ...customMeta
  } = props;
  const router = useRouter();
  const meta = {
    title: 'Nicolas Charpentier – Website',
    description: 'My personal website and blog.',
    image: DEFAULT_OG_IMAGE,
    type: 'website' as 'website' | 'article',
    author: 'Nicolas Charpentier',
    twitterUsername: '@charpeni_',
    ...customMeta,
  };

  // Strip query string and hash so paginated/anchored views don't
  // self-canonical and dilute link equity.
  const pathname = router.asPath.split(/[?#]/)[0];
  const canonicalUrl = `${SITE_URL}${pathname}`;

  // Sitewide JSON-LD: WebSite + Person. Page-specific structured data
  // (e.g. BlogPosting, BreadcrumbList) is appended via the `structuredData` prop.
  const websiteLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Nicolas Charpentier',
    url: SITE_URL,
    inLanguage: 'en',
    author: { '@type': 'Person', name: 'Nicolas Charpentier' },
  };

  const personLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Nicolas Charpentier',
    url: SITE_URL,
    image: `${SITE_URL}/static/images/nicolas_charpentier.jpeg`,
    jobTitle: 'Software Engineer',
    description:
      'Software Engineer focused on frontend infrastructure and developer tooling. Open source contributor writing about TypeScript, React, React Native, GraphQL, Apollo Client, and CI/CD.',
    knowsAbout: [
      'TypeScript',
      'JavaScript',
      'React',
      'React Native',
      'GraphQL',
      'Apollo Client',
      'Continuous Integration',
      'Frontend Infrastructure',
      'Developer Tooling',
      'ESLint',
      'Playwright',
      'Git',
    ],
    worksFor: {
      '@type': 'Organization',
      name: 'Shortcut',
      url: 'https://shortcut.com',
    },
    sameAs: [
      'https://github.com/charpeni',
      'https://x.com/charpeni_',
      'https://bsky.app/profile/charpeni.bsky.social',
      'https://www.linkedin.com/in/nicolas-charpentier-8a2b8a104/',
    ],
  };

  const extraLd = structuredData
    ? Array.isArray(structuredData)
      ? structuredData
      : [structuredData]
    : [];

  const allLd = [websiteLd, personLd, ...extraLd];

  return (
    <div className="bg-white dark:bg-black">
      <Head>
        <title>{meta.title}</title>
        <meta
          name="robots"
          content={noIndex ? 'noindex, follow' : 'index, follow'}
        />
        <meta content={meta.description} name="description" />
        <meta name="author" content={meta.author} />
        <meta property="og:url" content={canonicalUrl} />
        <link rel="canonical" href={canonicalUrl} />
        {markdownUrl ? (
          <link
            rel="alternate"
            type="text/markdown"
            href={markdownUrl}
            title="Markdown source"
          />
        ) : null}

        <meta property="og:type" content={meta.type} />
        <meta property="og:locale" content="en_US" />
        <meta property="og:site_name" content="Nicolas Charpentier" />
        <meta property="og:description" content={meta.description} />
        <meta property="og:title" content={meta.title} />
        <meta property="og:image" content={meta.image} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content={meta.title} />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content={meta.twitterUsername} />
        <meta name="twitter:creator" content={meta.twitterUsername} />
        <meta name="twitter:title" content={meta.title} />
        <meta name="twitter:description" content={meta.description} />
        <meta name="twitter:image" content={meta.image} />
        <meta name="twitter:image:alt" content={meta.title} />

        {meta.date ? (
          <meta property="article:published_time" content={meta.date} />
        ) : null}
        {updatedAt ? (
          <meta property="article:modified_time" content={updatedAt} />
        ) : null}
        {tags?.map((tag) => (
          <meta property="article:tag" content={tag} key={`tag-${tag}`} />
        ))}

        {allLd.map((ld, index) => (
          <script
            dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
            key={`ld-${index}`}
            type="application/ld+json"
          />
        ))}
      </Head>
      <Header />
      <main
        id="skip"
        className="flex flex-col justify-center bg-white dark:bg-black px-8"
      >
        {children}
        <Footer />
      </main>
    </div>
  );
}
