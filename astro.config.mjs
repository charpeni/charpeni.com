import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import remarkFrontmatter from 'remark-frontmatter';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeCodeTitles from 'rehype-code-titles';
import rehypeCallouts from 'rehype-callouts';

export default defineConfig({
  integrations: [
    mdx({
      remarkPlugins: [remarkFrontmatter],
      rehypePlugins: [
        rehypeSlug,
        rehypeAutolinkHeadings,
        rehypeCodeTitles,
        rehypeCallouts,
      ],
      extendMarkdownConfig: true,
      optimize: true,
      components: {
        div: 'src/components/MDXDiv.astro',
      },
      frontmatterOptions: {
        name: 'frontmatter',
      },
    }),
    react(),
    tailwind(),
  ],
  site: 'https://charpeni.com',
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
    },
  },
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
    },
    domains: [],
    remotePatterns: [],
  },
});
