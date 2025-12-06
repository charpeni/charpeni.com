import fs from 'node:fs';
import path from 'node:path';

import matter from 'gray-matter';

const SITE_URL = 'https://charpeni.com';

type PostMeta = {
  slug: string;
  title: string;
  publishedAt: string;
};

function getPostsMeta(): PostMeta[] {
  const postsDir = path.join(process.cwd(), 'posts');
  const files = fs.readdirSync(postsDir).filter((f) => f.endsWith('.mdx'));

  return files
    .map((file) => {
      const slug = file.replace(/\.mdx$/, '');
      const content = fs.readFileSync(path.join(postsDir, file), 'utf8');
      const { data } = matter(content);

      return {
        slug,
        title: data.title as string,
        publishedAt: data.publishedAt as string,
      };
    })
    .toSorted(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );
}

function generateLlmsTxt(posts: PostMeta[]): string {
  const postLinks = posts
    .map((post) => `- [${post.title}](${SITE_URL}/api/blog/${post.slug}.md)`)
    .join('\n');

  return `# Nicolas Charpentier's Blog

> Personal blog of Nicolas Charpentier, a Software Engineer specializing in React Native, React, GraphQL, and Continuous Integration. Open source enthusiast focused on frontend architecture, infrastructure, and improving developer experience.

## About

Nicolas Charpentier is a Software Engineer who describes himself as someone doing the "backend" work of the frontend: frontend architecture and infrastructure. Currently working at Shortcut.

## Blog Posts

All blog posts are available in markdown format at \`/api/blog/{slug}.md\`

${postLinks}

## Topics Covered

- TypeScript (type safety, type testing, generics)
- React and React Native
- GraphQL and Apollo Client
- Continuous Integration and DevOps
- JavaScript best practices
- Developer tooling (ESLint, Git, Playwright)
- Frontend architecture
- Web performance optimization

## Contact

- Website: ${SITE_URL}
- GitHub: https://github.com/charpeni
- LinkedIn: https://www.linkedin.com/in/nicolas-charpentier-8a2b8a104/
- Twitter/X: https://x.com/charpeni_
- Bluesky: https://bsky.app/profile/charpeni.bsky.social
- Email: blog@nicolascharpentier.com
`;
}

function main() {
  console.log('Generating llms.txt...');

  const posts = getPostsMeta();
  const content = generateLlmsTxt(posts);

  const outputPath = path.join(process.cwd(), 'public', 'llms.txt');
  fs.writeFileSync(outputPath, content);

  console.log(`Generated llms.txt with ${posts.length} posts`);
}

main();
