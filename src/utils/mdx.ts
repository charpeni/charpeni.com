import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import readingTime from 'reading-time';
import { getPlaiceholder } from 'plaiceholder';
import { getImagePath } from './image';

import type { ReadTimeResults } from 'reading-time';

export type PostFrontMatter = {
  title: string;
  publishedAt: string;
  summary: string;
  image: string;
  wordCount: number;
  readingTime: ReadTimeResults;
  slug: string;
  blurDataURL: string;
};

export async function getAllPostsFrontMatter(): Promise<PostFrontMatter[]> {
  const posts = await getCollection('blog');
  const postsWithMeta = await Promise.all(
    posts.map(async (post: CollectionEntry<'blog'>) => {
      const imagePath = getImagePath(post.data.image);
      const { base64 } = await getPlaiceholder(imagePath, { size: 20 });
      return {
        slug: post.slug,
        title: post.data.title,
        publishedAt: post.data.publishedAt,
        summary: post.data.summary,
        image: post.data.image,
        blurDataURL: base64,
        wordCount: post.body.split(/\s+/gu).length,
        readingTime: readingTime(post.body),
      };
    })
  );

  return postsWithMeta.sort(
    (a, b) => Number(new Date(b.publishedAt)) - Number(new Date(a.publishedAt))
  );
}
