'use client';

import Head from 'next/head';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { DesktopFooter, DesktopProfile } from '@/components/retro-terminal/DesktopChrome';
import {
  MIN_H,
  MIN_W,
  PRS_WINDOW_MAX_H,
  clampWinToViewport,
  legalGeom,
  maxWindowHeight,
  notFoundGeom,
  prsGeom,
  showGeom,
  termGeom,
} from '@/components/retro-terminal/geometry';
import { GraphLog } from '@/components/retro-terminal/GraphLog';
import { NOT_FOUND_ID, PRS_ID, STORAGE_KEY, TERM_ID, legalWinId, showWinId } from '@/components/retro-terminal/ids';
import { LatestPrsWindow } from '@/components/retro-terminal/LatestPrsWindow';
import { LegalWindow } from '@/components/retro-terminal/LegalWindow';
import { NotFoundWindow } from '@/components/retro-terminal/NotFoundWindow';
import { branchOf } from '@/components/retro-terminal/postUtils';
import { ShowTermWindow } from '@/components/retro-terminal/ShowWindow';
import { TermWindow } from '@/components/retro-terminal/TermWindow';
import type { LegalWindowVariant, MdxState, OpenWin, StoredTerminalState, WinGeom, WinState } from '@/components/retro-terminal/types';
import { useRetroMode } from '@/components/RetroModeContext';
import type { PostFrontMatter } from '@/utils/mdx';

import type { MDXRemoteSerializeResult } from 'next-mdx-remote';

function maxZof(states: Record<string, WinState>): number {
  let max = 0;
  for (const w of Object.values(states)) {
    if (w.z > max) max = w.z;
  }
  return max;
}

function readStoredTerminalState(): StoredTerminalState | null {
  if (globalThis.localStorage === undefined) return null;
  try {
    const raw = globalThis.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredTerminalState;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

function initialPostSlug(posts: PostFrontMatter[]): string | null {
  if (globalThis.location === undefined) return null;
  const { pathname } = new URL(globalThis.location.href);
  const match = /^\/blog\/([^/]+)$/.exec(pathname);
  const slug = match ? decodeURIComponent(match[1]) : null;
  return slug && posts.some((post) => post.slug === slug) ? slug : null;
}

function initialLegalVariant(): LegalWindowVariant | null {
  if (globalThis.location === undefined) return null;
  const { pathname } = new URL(globalThis.location.href);
  if (pathname === '/disclaimer') return 'disclaimer';
  if (pathname === '/privacy-policy') return 'privacy-policy';
  return null;
}

function pathForWindow(id: string | null, currentPath: string) {
  if (id?.startsWith('show:')) return `/blog/${id.slice('show:'.length)}`;
  if (id?.startsWith('legal:')) {
    const variant = id.slice('legal:'.length);
    if (variant === 'disclaimer' || variant === 'privacy-policy') return `/${variant}`;
  }
  if (id === NOT_FOUND_ID) return currentPath;
  return '/';
}

function updateWindowUrl(id: string | null) {
  if (globalThis.location === undefined || globalThis.history === undefined) return;
  const { pathname } = new URL(globalThis.location.href);
  const nextPath = pathForWindow(id, pathname);
  if (pathname === nextPath) return;
  globalThis.history.replaceState(globalThis.history.state, '', nextPath);
}

function useViewport() {
  const [size, setSize] = useState(() => ({
    w: typeof globalThis.innerWidth === 'number' ? globalThis.innerWidth : 1200,
    h: typeof globalThis.innerHeight === 'number' ? globalThis.innerHeight : 800,
  }));
  useEffect(() => {
    const update = () => setSize({ w: globalThis.innerWidth, h: globalThis.innerHeight });
    update();
    globalThis.addEventListener('resize', update);
    return () => globalThis.removeEventListener('resize', update);
  }, []);
  return size;
}

export default function RetroTerminal({
  posts,
  showNotFound = false,
}: {
  posts: PostFrontMatter[];
  showNotFound?: boolean;
}) {
  const { w: vw, h: vh } = useViewport();
  const isPhoneLayout = vw < 640 || vh <= 500;
  const bounds: WinGeom = { x: 0, y: 0, w: vw, h: vh };
  const stored = useMemo(() => readStoredTerminalState(), []);
  const urlPostSlug = useMemo(() => initialPostSlug(posts), [posts]);
  const urlLegalVariant = useMemo(() => initialLegalVariant(), []);
  const missingPath = useMemo(() => globalThis.location === undefined ? '/unknown' : globalThis.location.pathname, []);

  const [states, setStates] = useState<Record<string, WinState>>(() => {
    const g = termGeom(vw, vh, posts);
    const next: Record<string, WinState> = { [TERM_ID]: { id: TERM_ID, ...g, z: 1 } };
    if (urlPostSlug) {
      const id = showWinId(urlPostSlug);
      next[id] = { ...(next[id] ?? { id, ...showGeom(vw, vh) }), z: maxZof(next) + 1 };
    }
    if (urlLegalVariant) {
      const id = legalWinId(urlLegalVariant);
      next[id] = { id, ...legalGeom(vw, vh), z: maxZof(next) + 1 };
    }
    if (showNotFound) {
      next[NOT_FOUND_ID] = { id: NOT_FOUND_ID, ...notFoundGeom(vw, vh), z: maxZof(next) + 1 };
    }
    return next;
  });
  const [cursor, setCursor] = useState(() => {
    const urlPostIndex = urlPostSlug ? posts.findIndex((post) => post.slug === urlPostSlug) : -1;
    if (urlPostIndex >= 0) return urlPostIndex;
    const storedCursor = stored?.cursor;
    return typeof storedCursor === 'number' && storedCursor >= 0 && storedCursor < posts.length ? storedCursor : 0;
  });
  const [mdxBySlug, setMdxBySlug] = useState<Record<string, MdxState>>({});
  const [mobileProfileOpen, setMobileProfileOpen] = useState(false);
  const loadingSlugs = useRef(new Set<string>());
  const contentRef = useRef<HTMLDivElement | null>(null);
  const termWindowRef = useRef<HTMLDivElement | null>(null);
  const { setRetro } = useRetroMode();

  useEffect(() => {
    const recenterTerminal = () => {
      const g = termGeom(globalThis.innerWidth, globalThis.innerHeight, posts);
      setStates((prev) => {
        const term = prev[TERM_ID];
        if (!term) return prev;
        return { ...prev, [TERM_ID]: { ...term, ...g } };
      });
    };
    globalThis.addEventListener('resize', recenterTerminal);
    return () => globalThis.removeEventListener('resize', recenterTerminal);
  }, [posts]);

  useEffect(() => {
    if (globalThis.localStorage === undefined) return;
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify({ cursor }));
  }, [cursor]);

  useEffect(() => {
    if (globalThis.location === undefined) return;
    let top: WinState | null = null;
    for (const win of Object.values(states)) {
      if (top === null || win.z > top.z) {
        top = win;
      }
    }
    updateWindowUrl(top?.id ?? null);
  }, [states]);

  const focus = useCallback((id: string) => {
    setStates((prev) => {
      const w = prev[id];
      if (!w) return prev;
      const z = maxZof(prev) + 1;
      if (w.z === z - 1) return prev;
      return { ...prev, [id]: { ...w, z } };
    });
  }, []);

  const open = useCallback((id: string, geom: WinGeom) => {
    setStates((prev) => {
      const z = maxZof(prev) + 1;
      if (prev[id]) return { ...prev, [id]: { ...prev[id], ...geom, z } };
      const offset = id.startsWith('show:') ? 0 : (Object.keys(prev).length % 6) * 22;
      return { ...prev, [id]: { id, x: geom.x + offset, y: geom.y + offset, w: geom.w, h: geom.h, z } };
    });
  }, []);

  const close = useCallback((id: string) => {
    setStates((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const move = useCallback((id: string, x: number, y: number) => {
    setStates((prev) => {
      const w = prev[id];
      if (!w) return prev;
      const cx = Math.max(0, Math.min(x, bounds.w - 40));
      const cy = Math.max(0, Math.min(y, bounds.h - 24));
      return { ...prev, [id]: { ...w, x: cx, y: cy } };
    });
  }, [bounds.w, bounds.h]);

  const resize = useCallback((id: string, w: number, h: number) => {
    setStates((prev) => {
      const win = prev[id];
      if (!win) return prev;
      const cw = Math.max(MIN_W, Math.min(w, bounds.w - win.x));
      const maxHeight = Math.min(maxWindowHeight(bounds.h), id === PRS_ID ? PRS_WINDOW_MAX_H : bounds.h, bounds.h - win.y);
      const ch = Math.min(Math.max(MIN_H, h), maxHeight);
      return { ...prev, [id]: { ...win, w: cw, h: ch } };
    });
  }, [bounds.w, bounds.h]);

  const resetWindow = useCallback((id: string) => {
    setStates((prev) => {
      const win = prev[id];
      if (!win) return prev;
      const defaultGeom = id === TERM_ID
        ? termGeom(vw, vh, posts)
        : id === PRS_ID
          ? prsGeom(vw, vh)
          : id === NOT_FOUND_ID
            ? notFoundGeom(vw, vh)
          : id.startsWith('legal:')
            ? legalGeom(vw, vh)
            : id.startsWith('show:')
              ? showGeom(vw, vh)
              : null;
      if (!defaultGeom) return prev;
      return { ...prev, [id]: { ...win, ...defaultGeom } };
    });
  }, [posts, vh, vw]);

  const titleDragProps = useCallback(
    (id: string) => ({
      onPointerDown: (e: React.PointerEvent) => {
        if (e.button !== 0) return;
        const w = states[id];
        if (!w) return;
        focus(id);
        const startPx = e.clientX;
        const startPy = e.clientY;
        const originX = w.x;
        const originY = w.y;
        const pointerId = e.pointerId;
        const onMove = (ev: PointerEvent) => {
          if (ev.pointerId !== pointerId) return;
          move(id, originX + (ev.clientX - startPx), originY + (ev.clientY - startPy));
        };
        const onUp = (ev: PointerEvent) => {
          if (ev.pointerId !== pointerId) return;
          globalThis.removeEventListener('pointermove', onMove);
          globalThis.removeEventListener('pointerup', onUp);
        };
        globalThis.addEventListener('pointermove', onMove);
        globalThis.addEventListener('pointerup', onUp);
      },
    }),
    [states, focus, move],
  );

  const resizeHandleProps = useCallback(
    (id: string) => ({
      onPointerDown: (e: React.PointerEvent) => {
        if (e.button !== 0) return;
        const w = states[id];
        if (!w) return;
        focus(id);
        const startPx = e.clientX;
        const startPy = e.clientY;
        const startW = w.w;
        const startH = w.h;
        const pointerId = e.pointerId;
        const onMove = (ev: PointerEvent) => {
          if (ev.pointerId !== pointerId) return;
          resize(id, startW + (ev.clientX - startPx), startH + (ev.clientY - startPy));
        };
        const onUp = (ev: PointerEvent) => {
          if (ev.pointerId !== pointerId) return;
          globalThis.removeEventListener('pointermove', onMove);
          globalThis.removeEventListener('pointerup', onUp);
        };
        globalThis.addEventListener('pointermove', onMove);
        globalThis.addEventListener('pointerup', onUp);
      },
    }),
    [states, focus, resize],
  );

  const postByIndex = useCallback((i: number) => posts[i], [posts]);
  const postById = (slug: string) => posts.find((p) => p.slug === slug);
  const postSlugs = useMemo(() => new Set(posts.map((post) => post.slug)), [posts]);
  const currentPost = postByIndex(cursor);

  const loadMdx = useCallback((slug: string) => {
    if (!postSlugs.has(slug) || mdxBySlug[slug] || loadingSlugs.current.has(slug)) return;

    loadingSlugs.current.add(slug);
    void fetch(`/api/blog-mdx/${encodeURIComponent(slug)}`)
      .then((response) => {
        if (!response.ok) throw new Error(`Failed to load ${slug}`);
        return response.json() as Promise<{ mdxSource: MDXRemoteSerializeResult }>;
      })
      .then(({ mdxSource }) => {
        setMdxBySlug((prev) => ({ ...prev, [slug]: { status: 'ready', source: mdxSource } }));
      })
      .catch(() => {
        setMdxBySlug((prev) => ({ ...prev, [slug]: { status: 'error' } }));
      })
      .finally(() => {
        loadingSlugs.current.delete(slug);
      });
  }, [mdxBySlug, postSlugs]);

  useEffect(() => {
    const slugs = Object.keys(states)
      .filter((id) => id.startsWith('show:'))
      .map((id) => id.slice('show:'.length));

    for (const slug of slugs) {
      loadMdx(slug);
    }
  }, [loadMdx, states]);

  useEffect(() => {
    if (currentPost) loadMdx(currentPost.slug);
  }, [currentPost, loadMdx]);

  const openAt = (i: number) => {
    const post = postByIndex(i);
    if (!post) return;
    loadMdx(post.slug);
    open(showWinId(post.slug), showGeom(vw, vh));
    setMobileProfileOpen(false);
    setCursor(i);
  };

  const openBlogSlug = useCallback((slug: string) => {
    const index = posts.findIndex((post) => post.slug === slug);
    if (index === -1) return false;
    loadMdx(slug);
    open(showWinId(slug), showGeom(vw, vh));
    setCursor(index);
    return true;
  }, [loadMdx, open, posts, vh, vw]);

  const openPrs = useCallback(() => {
    open(PRS_ID, prsGeom(vw, vh));
  }, [open, vh, vw]);

  const openLegal = useCallback((variant: LegalWindowVariant) => {
    open(legalWinId(variant), legalGeom(vw, vh));
  }, [open, vh, vw]);

  const onShellClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const anchor = (e.target as Element | null)?.closest<HTMLAnchorElement>('a[href]');
    if (!anchor) return;

    const url = new URL(anchor.href, globalThis.location.href);
    if (url.origin !== globalThis.location.origin) return;
    const match = /^\/blog\/([^/]+)$/.exec(url.pathname);
    if (!match) return;

    if (openBlogSlug(decodeURIComponent(match[1]))) {
      e.preventDefault();
    }
  };

  const currentBranch = currentPost ? branchOf(currentPost) : undefined;

  const windows: OpenWin[] = useMemo(() => {
    const top = maxZof(states);
    return Object.values(states)
      .toSorted((a, b) => a.z - b.z)
      .map((w) => {
        const clamped = clampWinToViewport(w, vw, vh);
        return {
          id: clamped.id,
          geom: { x: clamped.x, y: clamped.y, w: clamped.w, h: clamped.h },
          z: clamped.z,
          focused: clamped.z === top,
        };
      });
  }, [states, vw, vh]);

  useEffect(() => {
    if (windows.find((win) => win.focused)?.id !== TERM_ID) return;
    termWindowRef.current?.focus({ preventScroll: true });
  }, [windows]);

  const onLogKeyDown = (e: React.KeyboardEvent) => {
    if (windows.find((win) => win.focused)?.id !== TERM_ID) return;
    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        setCursor((current) => Math.min(posts.length - 1, current + 1));
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        setCursor((current) => Math.max(0, current - 1));
        break;
      }
      case 'Enter': {
        e.preventDefault();
        openAt(cursor);
        break;
      }
      default: {
        break;
      }
    }
  };

  return (
    <div className="retro-terminal-shell" onClickCapture={onShellClickCapture}>
      {showNotFound ? (
        <Head>
          <title>404 — Archive Object Not Found</title>
          <meta name="robots" content="noindex, follow" />
        </Head>
      ) : null}
      <div className={`retro-terminal-desktop ${mobileProfileOpen ? 'retro-terminal-desktop--profile-open' : ''} ${Object.keys(states).length === 0 ? 'retro-terminal-desktop--empty' : ''}`}>
        <div className="retro-terminal-crt" aria-hidden="true" />
        <DesktopProfile
          onOpenPrs={openPrs}
          mobileExpanded={mobileProfileOpen}
          onToggleMobile={() => setMobileProfileOpen((open) => !open)}
        />
        <DesktopFooter onOpenLegal={openLegal} />

        {states[TERM_ID] ? null : (
          <button
            type="button"
            className="retro-terminal-launcher"
            onClick={() => open(TERM_ID, termGeom(vw, vh, posts))}
            aria-label="Open blog archive terminal"
          >
            <span className="retro-terminal-launcher-glyph" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                width="30"
                height="30"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="4" width="20" height="14" rx="2" />
                <path d="m6 9 3 3-3 3" />
                <path d="M13 15h4" />
              </svg>
            </span>
            <span className="retro-terminal-launcher-label">archive agent</span>
          </button>
        )}

        {windows.map((win) => {
          const active = win.focused;
          if (win.id === TERM_ID) {
            return (
              <TermWindow
                key={win.id}
                win={win}
                active={active}
                title="ssh blog@charpeni.com 'archive agent'"
                onClose={() => {
                  close(win.id);
                  setMobileProfileOpen(false);
                }}
                onEscape={() => {
                  close(win.id);
                  setMobileProfileOpen(false);
                }}
                dragProps={titleDragProps(win.id)}
                resizeProps={resizeHandleProps(win.id)}
                onActivate={() => focus(win.id)}
                onKeyDown={onLogKeyDown}
                onTitleDoubleClick={() => resetWindow(win.id)}
                windowRef={termWindowRef}
                 compact={isPhoneLayout}
              >
                <GraphLog
                  posts={posts}
                  cursor={cursor}
                  onSelect={setCursor}
                  onOpen={openAt}
                  isMobile={vw < 900 || isPhoneLayout}
                  contentRef={contentRef}
                />
                <div className="retro-terminal-status">
                  {isPhoneLayout ? (
                    <span><b>{posts.length}</b> posts · <b>{cursor + 1}</b> selected</span>
                  ) : (
                    <span>
                      <b>{posts.length}</b> commits · branch{' '}
                      <b>{currentBranch ?? 'main'}</b> · cursor{' '}
                      <b>{String(cursor + 1).padStart(2, '0')}</b>/{posts.length}
                    </span>
                  )}
                  <span className="retro-terminal-status-hint">
                    ↑/↓ move · enter show · dbl-click open · drag ◢ to resize
                  </span>
                </div>
              </TermWindow>
            );
          }
          if (win.id.startsWith('show:')) {
            const slug = win.id.slice('show:'.length);
            const post = postById(slug);
            if (!post) return null;
            return (
              <ShowTermWindow
                key={win.id}
                win={win}
                active={active}
                post={post}
                mdxState={mdxBySlug[slug]}
                onClose={() => close(win.id)}
                onActivate={() => focus(win.id)}
                dragProps={titleDragProps(win.id)}
                resizeProps={resizeHandleProps(win.id)}
                onOpenBlogLink={openBlogSlug}
                onTitleDoubleClick={() => resetWindow(win.id)}
                 compact={isPhoneLayout}
              />
            );
          }
          if (win.id === PRS_ID) {
            return (
              <LatestPrsWindow
                key={win.id}
                win={win}
                active={active}
                onClose={() => close(win.id)}
                onActivate={() => focus(win.id)}
                dragProps={titleDragProps(win.id)}
                resizeProps={resizeHandleProps(win.id)}
                onTitleDoubleClick={() => resetWindow(win.id)}
                 compact={isPhoneLayout}
              />
            );
          }
          if (win.id === NOT_FOUND_ID) {
            return (
              <NotFoundWindow
                key={win.id}
                win={win}
                active={active}
                path={missingPath}
                onClose={() => close(win.id)}
                onActivate={() => focus(win.id)}
                dragProps={titleDragProps(win.id)}
                resizeProps={resizeHandleProps(win.id)}
                onTitleDoubleClick={() => resetWindow(win.id)}
                 compact={isPhoneLayout}
              />
            );
          }
          if (win.id.startsWith('legal:')) {
            const variant = win.id.slice('legal:'.length) as LegalWindowVariant;
            if (variant !== 'disclaimer' && variant !== 'privacy-policy') return null;
            return (
              <LegalWindow
                key={win.id}
                win={win}
                active={active}
                variant={variant}
                onOpenLegal={openLegal}
                onClose={() => close(win.id)}
                onActivate={() => focus(win.id)}
                dragProps={titleDragProps(win.id)}
                resizeProps={resizeHandleProps(win.id)}
                onTitleDoubleClick={() => resetWindow(win.id)}
                 compact={isPhoneLayout}
              />
            );
          }
          return null;
        })}

        {/* exit button — top-right corner, fits the cream theme */}
        <button
          className={`retro-toggle retro-toggle--retro retro-terminal-exit ${
            isPhoneLayout && windows.some((win) => win.focused && win.id.startsWith('show:'))
              ? 'retro-terminal-exit--behind-reader'
              : ''
          }`}
          onClick={() => {
            setRetro(false);
            globalThis.location.reload();
          }}
          aria-label="Exit terminal mode"
        >
          <span className="retro-toggle-dot" />
          EXIT TERMINAL
        </button>
      </div>
    </div>
  );
}
