import Image from 'next/image';
import { parseISO, format } from 'date-fns';
import { SocialIcon as ReactSocialIcon } from 'react-social-icons';

import Container from '@/components/Container';
import { openWindow } from '@/utils/openWindow';

function ShareSocialIcon({ network }: { network: string }) {
  const socialIconWidth = 40;
  const socialIconStyle = {
    width: socialIconWidth,
    height: socialIconWidth,
  };

  return <ReactSocialIcon network={network} style={socialIconStyle} />;
}

const editUrl = (slug: string) =>
  `https://github.com/charpeni/charpeni.com/edit/main/posts/${slug}.mdx`;

export default function BlogLayout({ children, frontMatter }) {
  const postUrl = `https://charpeni.com/blog/${frontMatter.slug}`;

  return (
    <Container
      title={`${frontMatter.title} | Nicolas Charpentier`}
      description={frontMatter.summary}
      image={`https://charpeni.com${frontMatter.image}`}
      date={new Date(frontMatter.publishedAt).toISOString()}
      type="article"
    >
      <article className="flex flex-col justify-center max-w-2xl mx-auto mb-4 w-full">
        <h1 className="font-bold text-3xl md:text-5xl tracking-tight mb-4 text-black dark:text-white">
          {frontMatter.title}
        </h1>
        <div className="flex flex-row justify-between items-start md:items-center w-full mt-2">
          <div className="flex items-center">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {format(parseISO(frontMatter.publishedAt), 'MMMM dd, yyyy')}
            </p>
          </div>
          <p className="text-sm text-gray-500">
            {frontMatter.readingTime.text}
          </p>
        </div>
        <div className="prose dark:prose-dark max-w-none w-full mt-4 mb-8">
          <Image
            alt={frontMatter.title}
            src={frontMatter.image}
            width={1600}
            height={800}
            placeholder="blur"
            blurDataURL={frontMatter.blurDataURL}
            priority
          />
          {children}
        </div>
        <div className="flex justify-between items-baseline text-sm text-gray-700 dark:text-gray-300">
          <div className="flex flex-row items-baseline space-x-2">
            <span className="underline decoration-2 decoration-yellow-400 pr-2">
              Share on:
            </span>
            <button
              title="Share on Twitter"
              onClick={() => {
                const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
                  `${frontMatter.title} by @charpeni_

${postUrl}`,
                )}`;
                openWindow(url);
              }}
            >
              <ShareSocialIcon network="twitter" />
            </button>
            <button
              title="Share on LinkedIn"
              onClick={() => {
                const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
                  postUrl,
                )}`;
                openWindow(url);
              }}
            >
              <ShareSocialIcon network="linkedin" />
            </button>
          </div>
          <a
            href={editUrl(frontMatter.slug)}
            target="_blank"
            rel="noopener noreferrer"
          >
            {'📝 Edit on GitHub'}
          </a>
        </div>
      </article>
    </Container>
  );
}
