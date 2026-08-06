import fs from 'node:fs';
import path from 'node:path';

import type { MDXRemoteSerializeResult } from 'next-mdx-remote';

type BlogPageData = {
  pageProps: {
    mdxSource: MDXRemoteSerializeResult;
  };
};

function parseBlogPageData(filePath: string): BlogPageData {
  const page = JSON.parse(
    fs.readFileSync(filePath, 'utf8'),
  ) as Partial<BlogPageData> | null;

  if (typeof page?.pageProps?.mdxSource?.compiledSource !== 'string') {
    throw new TypeError(`Missing compiled MDX source in ${filePath}`);
  }

  return page as BlogPageData;
}

const root = process.cwd();
const pagesDir = path.join(root, '.next', 'server', 'pages', 'blog');
const outputDir = path.join(root, 'public', 'blog-mdx');

function main() {
  console.log('Generating static blog MDX...');

  const files = fs
    .readdirSync(pagesDir)
    .filter((file) => file.endsWith('.json') && !file.endsWith('.nft.json'))
    .toSorted();

  if (files.length === 0) {
    throw new Error(`No blog page data found in ${pagesDir}`);
  }

  fs.rmSync(outputDir, { recursive: true, force: true });
  fs.mkdirSync(outputDir, { recursive: true });

  for (const file of files) {
    const page = parseBlogPageData(path.join(pagesDir, file));
    const output = JSON.stringify({ mdxSource: page.pageProps.mdxSource });
    fs.writeFileSync(path.join(outputDir, file), output);
  }

  console.log(`Generated static MDX for ${files.length} posts`);
}

main();
