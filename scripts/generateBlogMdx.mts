import fs from 'node:fs';
import path from 'node:path';

import type { MDXRemoteSerializeResult } from 'next-mdx-remote';

type BlogPageData = {
  pageProps: {
    mdxSource: MDXRemoteSerializeResult;
  };
};

const root = process.cwd();
const pagesDir = path.join(root, '.next', 'server', 'pages', 'blog');
const outputDir = path.join(root, 'public', 'blog-mdx');

function main() {
  console.log('Generating static blog MDX...');

  const files = fs
    .readdirSync(pagesDir)
    .filter((file) => file.endsWith('.json') && !file.endsWith('.nft.json'))
    .toSorted();

  fs.rmSync(outputDir, { recursive: true, force: true });
  fs.mkdirSync(outputDir, { recursive: true });

  for (const file of files) {
    const page = JSON.parse(
      fs.readFileSync(path.join(pagesDir, file), 'utf8'),
    ) as BlogPageData;
    const output = JSON.stringify({ mdxSource: page.pageProps.mdxSource });
    fs.writeFileSync(path.join(outputDir, file), output);
  }

  console.log(`Generated static MDX for ${files.length} posts`);
}

main();
