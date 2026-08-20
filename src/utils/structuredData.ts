import { SITE_URL } from './postMeta';

/**
 * JSON-LD builders ported verbatim from the Next.js site:
 * WebSite + Person from components/Container.tsx, BlogPosting +
 * BreadcrumbList from components/BlogLayout.tsx.
 */

export function websiteLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Nicolas Charpentier',
    url: SITE_URL,
    inLanguage: 'en',
    author: { '@type': 'Person', name: 'Nicolas Charpentier' },
  };
}

export function personLd() {
  return {
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
}

type BlogPostingInput = {
  title: string;
  summary: string;
  imageUrl?: string;
  publishedAtIso: string;
  updatedAtIso: string;
  tags: string[];
  postUrl: string;
};

export function blogPostingLd({
  title,
  summary,
  imageUrl,
  publishedAtIso,
  updatedAtIso,
  tags,
  postUrl,
}: BlogPostingInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description: summary,
    ...(imageUrl ? { image: [imageUrl] } : {}),
    datePublished: publishedAtIso,
    dateModified: updatedAtIso,
    ...(tags.length > 0 ? { keywords: tags.join(', ') } : {}),
    author: {
      '@type': 'Person',
      name: 'Nicolas Charpentier',
      url: SITE_URL,
    },
    publisher: {
      '@type': 'Person',
      name: 'Nicolas Charpentier',
      url: SITE_URL,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': postUrl,
    },
    url: postUrl,
    inLanguage: 'en',
  };
}

export function breadcrumbLd({
  title,
  postUrl,
}: {
  title: string;
  postUrl: string;
}) {
  return {
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
        name: title,
        item: postUrl,
      },
    ],
  };
}
