import { useCallback, useState } from 'react';

import type { CopyStatus } from './types';

/**
 * Writes text to the clipboard, falling back to the legacy
 * `document.execCommand('copy')` path when the async Clipboard API is absent
 * or rejected in non-secure local development contexts.
 */
async function writeToClipboard(text: string): Promise<void> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
  } catch {
    // Fall through to the legacy synchronous path below.
  }

  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.top = '-1000px';
  ta.style.opacity = '0';
  document.body.append(ta);
  ta.select();
  const ok = document.execCommand('copy');
  ta.remove();
  if (!ok) throw new Error('execCommand copy failed');
}

/**
 * Fetches the post's raw Markdown source from `/api/blog/{slug}.md` and writes
 * it to the clipboard. Exposes an imperative action for the terminal `c` keybind.
 */
export function useCopyMarkdown(slug: string) {
  const [status, setStatus] = useState<CopyStatus>('idle');
  const copy = useCallback(async () => {
    setStatus('copying');
    try {
      const res = await fetch(`/api/blog/${slug}.md`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const md = await res.text();
      await writeToClipboard(md);
      setStatus('copied');
    } catch {
      setStatus('error');
    }
    globalThis.setTimeout(() => setStatus('idle'), 2000);
  }, [slug]);
  return { status, copy };
}
