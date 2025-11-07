import Link from 'next/link';
import { useState, useEffect } from 'react';

import { useTheme } from 'next-themes';

import { Moon } from './Moon';
import { Sun } from './Sun';

export default function Header() {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  // After mounting, we have access to the theme
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  return (
    <nav className="flex justify-between items-center max-w-4xl w-full py-8 my-0 md:my-8 mx-auto px-8 lg:px-0 bg-white dark:bg-black">
      <button
        aria-label="Toggle Dark Mode"
        type="button"
        className="cursor-pointer bg-gray-200 dark:bg-gray-800 rounded p-2.5 h-10 w-10 flex items-center justify-center"
        onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      >
        {mounted ? resolvedTheme === 'dark' ? <Sun /> : <Moon /> : null}
      </button>
      <div>
        <Link href="/" className="p-2 sm:p-4 text-gray-900 dark:text-gray-100">
          Home
        </Link>
      </div>
    </nav>
  );
}
