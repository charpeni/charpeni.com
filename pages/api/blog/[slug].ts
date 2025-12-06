import fs from 'node:fs';
import path from 'node:path';

import type { NextApiRequest, NextApiResponse } from 'next';

const root = process.cwd();

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { slug } = req.query;

  if (typeof slug !== 'string') {
    return res.status(400).send('Invalid slug');
  }

  // Remove .md extension if present
  const cleanSlug = slug.replace(/\.md$/, '');
  const filePath = path.join(root, 'posts', `${cleanSlug}.mdx`);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Post not found');
  }

  const content = fs.readFileSync(filePath, 'utf8');

  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  res.setHeader('Content-Disposition', `inline; filename="${cleanSlug}.md"`);

  return res.status(200).send(content);
}
