import NextLink from 'next/link';

import MySocials from '@/components/MySocials';

function Separator() {
  return <span className="px-1">|</span>;
}

export default function Footer() {
  return (
    <footer className="flex flex-col justify-center items-start max-w-2xl mx-auto w-full mb-8">
      <hr className="w-full border-1 border-gray-200 dark:border-gray-800 mb-8" />
      <div className="flex justify-center max-w-2xl mx-auto w-full">
        <MySocials />
      </div>
      <div className="flex justify-center max-w-2xl mx-auto w-full mt-2 text-sm text-gray-400 dark:text-gray-600">
        <span>© {new Date().getFullYear()} Nicolas Charpentier</span>
        <Separator />
        <NextLink href="/disclaimer">
          <a>Disclaimer</a>
        </NextLink>
        <Separator />
        <NextLink href="/privacy-policy">
          <a>Privacy Policy</a>
        </NextLink>
      </div>
    </footer>
  );
}
