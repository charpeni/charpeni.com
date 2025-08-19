import Image from 'next/image';
import Link from 'next/link';

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
};

export default MDXComponents;
