import Link from 'next/link';
import Image from 'next/image';

type Props = {
  title: string;
  summary: string;
  slug: string;
  image: string;
  blurDataURL: string;
};

export default function BlogPostCard({
  title,
  summary,
  slug,
  image,
  blurDataURL,
}: Props) {
  return (
    <Link href={`/blog/${slug}`} className="w-full mb-8">
      <div className="w-full rounded shadow-md hover:shadow-lg dark:ring-1 dark:ring-gray-500 dark:hover:ring-2 dark:hover:ring-gray-400 transition-all">
        <div className="relative w-full pt-[30%]">
          <Image
            className="rounded-t"
            alt={title}
            src={image}
            placeholder="blur"
            blurDataURL={blurDataURL}
            fill
            sizes="(min-width: 768px) 85vw,
                    (min-width: 1280px) 50vw,
                    33vw"
            style={{
              objectFit: 'cover',
            }}
          />
        </div>
        <div className="p-4">
          <div className="flex flex-col md:flex-row justify-between">
            <h4 className="text-lg md:text-xl font-medium mb-2 w-full text-gray-900 dark:text-gray-100">
              {title}
            </h4>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{summary}</p>
        </div>
      </div>
    </Link>
  );
}
