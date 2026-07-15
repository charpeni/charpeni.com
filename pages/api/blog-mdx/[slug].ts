import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ error: 'Not found' });
  }

  const { slug } = req.query;
  const { getPostBySlug, getPosts } = await import('@/utils/mdx');
  const validSlugs = new Set(getPosts().map((post) => post.replace(/\.mdx$/, '')));

  if (typeof slug !== 'string' || !validSlugs.has(slug)) {
    return res.status(404).json({ error: 'Post not found' });
  }

  const { mdxSource } = await getPostBySlug(slug);
  return res.status(200).json({ mdxSource });
}
