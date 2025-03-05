import Image from 'next/image';
import { parseISO, format } from 'date-fns';
import { SocialIcon as ReactSocialIcon } from 'react-social-icons';
import Container from '@/components/Container';
import { openWindow } from '@/utils/openWindow';
import { Comments } from './Comments';
import styles from '@/styles/GradientAnimation.module.css';

function ShareSocialIcon({ network }: { network: string }) {
  const socialIconWidth = 40;
  const socialIconStyle = {
    width: socialIconWidth,
    height: socialIconWidth,
  };

  return (
    <ReactSocialIcon
      network={network}
      style={socialIconStyle}
      fgColor="white"
    />
  );
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
      <article className="flex flex-col justify-center max-w-3xl mx-auto mb-16 w-full">
        <header className="mb-12">
          <h1 className="font-bold text-4xl md:text-5xl lg:text-6xl tracking-tight text-black dark:text-white">
            {frontMatter.title}
          </h1>
        </header>

        <div className="relative w-full aspect-[2/1] mb-8 rounded-xl overflow-hidden">
          <Image
            alt={frontMatter.title}
            src={frontMatter.image}
            fill
            priority
            className="object-cover"
            placeholder="blur"
            blurDataURL={frontMatter.blurDataURL}
          />
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-gray-700 dark:text-gray-300 mb-8">
          <div className="flex items-center justify-between md:justify-start w-full md:w-auto">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 relative w-12 h-12 rounded-full overflow-hidden shadow-[0_0_20px_rgba(59,130,246,0.08),0_0_40px_rgba(147,51,234,0.05),0_0_60px_rgba(236,72,153,0.03)]">
                <div className={`absolute -inset-[3px] ${styles.gradientRotate}`} />
                <div className="absolute inset-[2px] bg-gray-50 dark:bg-gray-900 rounded-full overflow-hidden">
                  <Image
                    className="object-cover rounded-full"
                    src="/static/images/nicolas_charpentier.jpeg"
                    alt="Nicolas Charpentier"
                    fill
                    sizes="48px"
                    quality={100}
                  />
                </div>
              </div>
              <div>
                <div className="font-medium">Nicolas Charpentier</div>
                <div className="text-sm text-gray-500">
                  {format(parseISO(frontMatter.publishedAt), 'MMMM dd, yyyy')}
                </div>
              </div>
            </div>
            <div className="md:hidden">
              <span className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-sm">
                {frontMatter.readingTime.text}
              </span>
            </div>
          </div>
          <div className="hidden md:flex items-center">
            <span className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-sm">
              {frontMatter.readingTime.text}
            </span>
          </div>
        </div>

        <div className="prose dark:prose-dark max-w-none w-full">
          {children}
        </div>

        <footer className="mt-12 pt-6 border-t border-gray-200 dark:border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-4">
              <span className="font-medium text-gray-700 dark:text-gray-300">
                Share this article
              </span>
              <div className="flex gap-2">
                <button
                  title="Share on Twitter"
                  onClick={() => {
                    const url = new URL('https://twitter.com/intent/tweet');
                    url.searchParams.set(
                      'text',
                      `${frontMatter.title} by @charpeni_\n\n${postUrl}`,
                    );
                    openWindow(url.toString());
                  }}
                  className="transition-transform hover:scale-110"
                >
                  <ShareSocialIcon network="twitter" />
                </button>
                <button
                  title="Share on LinkedIn"
                  onClick={() => {
                    const url = new URL(
                      'https://www.linkedin.com/sharing/share-offsite',
                    );
                    url.searchParams.set('url', postUrl);
                    openWindow(url.toString());
                  }}
                  className="transition-transform hover:scale-110"
                >
                  <ShareSocialIcon network="linkedin" />
                </button>
              </div>
            </div>
            <a
              href={editUrl(frontMatter.slug)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit on GitHub
            </a>
          </div>
        </footer>
      </article>

      <div className="max-w-3xl mx-auto w-full">
        <Comments title={frontMatter.title} />
      </div>
    </Container>
  );
}
