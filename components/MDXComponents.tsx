import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';

import CodeBlock from '@/components/CodeBlock';

const Sandpack = dynamic(() => import('@/components/Sandpack'), {
  ssr: false,
  loading: () => (
    <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-8 text-center">
      Loading code editor...
    </div>
  ),
});

function CustomLink(props: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  const { href } = props;

  const isInternalLink = href?.startsWith('/') || href?.startsWith('#');

  if (isInternalLink && href) {
    return <Link href={href} {...props} />;
  }

  return <a target="_blank" rel="noopener noreferrer" {...props} />;
}

const MDXComponents = {
  Image,
  a: CustomLink,
  pre: CodeBlock,
  Sandpack,
};

export default MDXComponents;
