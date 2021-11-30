import { useState, useEffect } from 'react';
import NextLink from 'next/link';
import { useTheme } from 'next-themes';

function Sun() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      className="h-5 w-5 text-gray-800 dark:text-gray-200"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="m0 0h24v24h-24z"
        opacity="0"
        transform="matrix(-1 0 0 -1 24 24)"
      />
      <path d="m12 6a1 1 0 0 0 1-1v-2a1 1 0 0 0 -2 0v2a1 1 0 0 0 1 1z" />
      <path d="m21 11h-2a1 1 0 0 0 0 2h2a1 1 0 0 0 0-2z" />
      <path d="m6 12a1 1 0 0 0 -1-1h-2a1 1 0 0 0 0 2h2a1 1 0 0 0 1-1z" />
      <path d="m6.22 5a1 1 0 0 0 -1.39 1.47l1.44 1.39a1 1 0 0 0 .73.28 1 1 0 0 0 .72-.31 1 1 0 0 0 0-1.41z" />
      <path d="m17 8.14a1 1 0 0 0 .69-.28l1.44-1.39a1 1 0 0 0 -1.35-1.47l-1.44 1.42a1 1 0 0 0 0 1.41 1 1 0 0 0 .66.31z" />
      <path d="m12 18a1 1 0 0 0 -1 1v2a1 1 0 0 0 2 0v-2a1 1 0 0 0 -1-1z" />
      <path d="m17.73 16.14a1 1 0 0 0 -1.39 1.44l1.44 1.42a1 1 0 0 0 .69.28 1 1 0 0 0 .72-.3 1 1 0 0 0 0-1.42z" />
      <path d="m6.27 16.14-1.44 1.39a1 1 0 0 0 0 1.42 1 1 0 0 0 .72.3 1 1 0 0 0 .67-.25l1.44-1.39a1 1 0 0 0 -1.39-1.44z" />
      <path d="m12 8a4 4 0 1 0 4 4 4 4 0 0 0 -4-4zm0 6a2 2 0 1 1 2-2 2 2 0 0 1 -2 2z" />
    </svg>
  );
}

function Moon() {
  return (
    <svg
      viewBox="0 0 512 512"
      fill="currentColor"
      stroke="currentColor"
      className="h-4 w-4 text-gray-800 dark:text-gray-200"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="m275.4 500.7c-135 0-244.7-109.8-244.7-244.7s109.8-244.7 244.7-244.7c8.2 0 16.4.4 24.6 1.2 7.2.7 13.5 5.2 16.5 11.7s2.4 14.2-1.6 20.2c-23 33.8-35.2 73.3-35.2 114.2 0 105 78.7 192.2 183.2 202.6 7.2.7 13.5 5.2 16.5 11.7 3.1 6.5 2.4 14.2-1.6 20.2-45.8 67.4-121.4 107.6-202.4 107.6zm-12.5-448c-106.5 6.5-191.2 95.2-191.2 203.3 0 112.3 91.4 203.7 203.7 203.7 56.4 0 109.6-23.4 147.8-63.7-46.2-11.7-88.1-36.8-120.8-72.6-41.1-45.2-63.8-103.6-63.8-164.6.1-37.1 8.4-73.2 24.3-106.1z" />
    </svg>
  );
}

export default function Header() {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  // After mounting, we have access to the theme
  useEffect(() => setMounted(true), []);

  return (
    <nav className="flex justify-between items-center max-w-4xl w-full p-8 my-0 md:my-8 mx-auto bg-white dark:bg-black">
      <button
        aria-label="Toggle Dark Mode"
        type="button"
        className="bg-gray-200 dark:bg-gray-800 rounded p-3 dark:p-2.5 h-10 w-10"
        onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      >
        {mounted ? resolvedTheme === 'dark' ? <Sun /> : <Moon /> : null}
      </button>
      <div>
        <NextLink href="/">
          <a className="p-2 sm:p-4 text-gray-900 dark:text-gray-100">Home</a>
        </NextLink>
      </div>
    </nav>
  );
}
