import fs from 'node:fs';
import path from 'node:path';

import type { NextApiRequest, NextApiResponse } from 'next';

import { absolutizeMarkdownLinks } from '@/utils/absolutizeMarkdownLinks';

const root = process.cwd();
const SITE_URL = 'https://charpeni.com';

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

  const raw = fs.readFileSync(filePath, 'utf8');

  // Rewrite root-relative URLs to absolute ones so the file remains
  // self-contained when consumed out of context (LLM ingestion, copy-paste
  // into ChatGPT/Claude, etc.).
  const content = absolutizeMarkdownLinks(raw, SITE_URL);

  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  res.setHeader('Content-Disposition', `inline; filename="${cleanSlug}.md"`);

  return res.status(200).send(content);
}
