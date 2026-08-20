import MdxImage from '@/components/mdx/MdxImage.astro';
import Sandpack from '@/components/mdx/Sandpack.astro';

/**
 * Components available inside post MDX bodies — the Astro equivalent of
 * components/MDXComponents.tsx. `pre`/copy buttons are a delegated vanilla
 * script (Enhancer.astro), not a mapping; external-link target=_blank is
 * also handled there.
 */
export const mdxComponents = {
  Image: MdxImage,
  Sandpack,
};
