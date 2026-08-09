import { Suspense, lazy, useEffect, useRef, useState } from 'react';

import type { SandpackEditorProps } from '@/components/mdx/SandpackEditor';

const SandpackEditor = lazy(
  () => import('@/components/mdx/SandpackEditor'),
);

/**
 * Viewport-gated wrapper around SandpackEditor.
 *
 * `client:only` hydrates as soon as the island script runs, so importing
 * @codesandbox/sandpack-react at module scope pulled ~270KB of React +
 * CodeMirror into the critical path and pushed FCP out by ~1.2s on the one
 * post that uses it. Keeping the heavy editor behind `lazy()` — and only
 * resolving it once the embed is near the viewport — leaves the island
 * itself tiny while the article text paints.
 *
 * The placeholder mirrors the server-rendered `fallback` slot in
 * Sandpack.astro (same classes, same reserved height) so swapping between
 * them is invisible and reserves layout up front.
 */
export default function SandpackReact(props: SandpackEditorProps) {
  const { height = 400 } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    // No IntersectionObserver (or a stale engine): load rather than never
    // render the editor at all.
    if (typeof IntersectionObserver === 'undefined') {
      setShouldLoad(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      // Start fetching slightly before the embed scrolls into view so the
      // editor is usually ready by the time it is.
      { rootMargin: '300px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const placeholder = (
    <div
      className="bg-gray-100 dark:bg-gray-800 rounded-lg p-8 text-center"
      style={{ minHeight: height }}
    >
      Loading code editor...
    </div>
  );

  return (
    <div className="sandpackContainer" ref={containerRef}>
      {shouldLoad ? (
        <Suspense fallback={placeholder}>
          <SandpackEditor {...props} />
        </Suspense>
      ) : (
        placeholder
      )}
    </div>
  );
}
