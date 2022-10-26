import Link from 'next/link';
import Image from 'next/legacy/image';

function CustomLink(props: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  const { href } = props;

  const isInternalLink = href?.startsWith('/') || href?.startsWith('#');

  if (isInternalLink) {
    return <Link href={href} {...props} />;
  }

  return <a target="_blank" rel="noopener noreferrer" {...props} />;
}

const MDXComponents = {
  Image,
  a: CustomLink,
};

export default MDXComponents;
