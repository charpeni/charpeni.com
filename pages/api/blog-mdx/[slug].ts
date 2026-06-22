import type { NextApiRequest, NextApiResponse } from 'next';

import { getPostBySlug, getPosts } from '@/utils/mdx';

const validSlugs = new Set(getPosts().map((post) => post.replace(/\.mdx$/, '')));

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { slug } = req.query;

  if (typeof slug !== 'string' || !validSlugs.has(slug)) {
    return res.status(404).json({ error: 'Post not found' });
  }

  const { mdxSource } = await getPostBySlug(slug);
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=31536000, immutable');
  return res.status(200).json({ mdxSource });
}
