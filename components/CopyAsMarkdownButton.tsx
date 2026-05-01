import { useCallback, useState } from 'react';

type Status = 'idle' | 'copying' | 'copied' | 'error';

type Props = {
  slug: string;
  /**
   * Optional className to merge with the default pill styling. Useful when the
   * button needs slightly different sizing in mobile vs desktop slots.
   */
  className?: string;
};

/**
 * Pill-styled button that fetches the post's raw Markdown source from
 * `/api/blog/{slug}.md` and writes it to the clipboard. Pairs with the
 * `<link rel="alternate" type="text/markdown">` head tag on the same page:
 * one is for crawlers/LLMs, the other for humans pasting the post into an
 * LLM as context.
 */
export default function CopyAsMarkdownButton({ slug, className = '' }: Props) {
  const [status, setStatus] = useState<Status>('idle');

  const handleClick = useCallback(async () => {
    if (status === 'copying') return;

    setStatus('copying');

    try {
      const response = await fetch(`/api/blog/${slug}.md`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const markdown = await response.text();
      await navigator.clipboard.writeText(markdown);

      setStatus('copied');
      setTimeout(() => setStatus('idle'), 2000);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 2000);
    }
  }, [slug, status]);

  const label =
    status === 'copied'
      ? 'Copied!'
      : status === 'error'
        ? 'Failed to copy'
        : status === 'copying'
          ? 'Copying…'
          : 'Copy as Markdown';

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={status === 'copying'}
      aria-label="Copy post as Markdown to clipboard"
      title="Copy the raw Markdown source of this post — useful for pasting into an LLM as context."
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-sm cursor-pointer transition-colors hover:bg-gray-200 dark:hover:bg-gray-700 disabled:cursor-wait disabled:opacity-70 ${className}`}
    >
      {status === 'copied' ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
        </svg>
      )}
      <span>{label}</span>
    </button>
  );
}
