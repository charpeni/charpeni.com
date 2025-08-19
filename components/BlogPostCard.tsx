import Image from 'next/image';
import Link from 'next/link';

type Props = {
  title: string;
  summary: string;
  slug: string;
  image: string;
  blurDataURL: string;
  readingTime: { text: string };
  priority?: boolean;
};

export default function BlogPostCard({
  title,
  summary,
  slug,
  image,
  blurDataURL,
  readingTime,
  priority,
}: Props) {
  return (
    <Link href={`/blog/${slug}`} className="group block w-full h-full">
      <article className="bg-white dark:bg-gray-900 rounded-xl overflow-hidden transform transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-xl dark:ring-1 dark:ring-gray-800 h-full flex flex-col">
        <div className="relative w-full pt-[56.25%] flex-shrink-0">
          <Image
            className="rounded-t-xl"
            alt={title}
            src={image}
            placeholder="blur"
            blurDataURL={blurDataURL}
            fill
            sizes="(min-width: 768px) 432px, 90vw"
            priority={Boolean(priority)}
            style={{
              objectFit: 'cover',
            }}
          />
        </div>
        <div className="p-6 flex flex-col flex-1">
          <div className="flex flex-col flex-1">
            <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {title}
            </h3>
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              {readingTime.text}
            </div>
            <p className="text-gray-600 dark:text-gray-400 line-clamp-3 flex-1">
              {summary}
            </p>
          </div>
          <div className="mt-4">
            <span className="inline-flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 group-hover:text-blue-800 dark:group-hover:text-blue-300">
              Read more
              <svg
                className="ml-2 w-4 h-4"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
