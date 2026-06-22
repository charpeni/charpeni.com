import type { NextApiRequest, NextApiResponse } from 'next';

import type { LatestPr } from '@/components/retro-terminal/types';

function decodeXml(text: string) {
  return text
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'");
}

function readTag(item: string, tag: string) {
  const match = new RegExp(String.raw`<${tag}>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?</${tag}>`).exec(item);
  return match ? decodeXml(match[1].trim()) : '';
}

function parsePr(url: string) {
  const match = /^https:\/\/github\.com\/([^/]+\/[^/]+)\/pull\/(\d+)$/.exec(url);
  return { repo: match?.[1] ?? 'unknown/repo', number: match?.[2] ? `#${match[2]}` : '' };
}

function parseFeed(xml: string): LatestPr[] {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 12).map((match) => {
    const item = match[1];
    const title = readTag(item, 'title');
    const url = readTag(item, 'link');
    const { repo, number } = parsePr(url);
    return {
      title,
      url,
      repo,
      number,
      publishedAt: readTag(item, 'pubDate'),
    };
  });
}

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  let response: Response;
  try {
    response = await fetch('https://prs.charpeni.com/feed.xml');
  } catch {
    return res.status(502).json({ error: 'Failed to fetch latest PRs' });
  }

  if (!response.ok) return res.status(502).json({ error: 'Failed to fetch latest PRs' });

  const xml = await response.text();
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400');
  return res.status(200).json({ prs: parseFeed(xml) });
}
