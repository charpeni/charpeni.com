/**
 * The terminal window manager — a framework-free port of RetroTerminal.tsx's
 * behavior layer onto the SERVER-RENDERED desktop (DesktopShell.astro).
 *
 * Structure: a single `state` object (windows, focus, cursor) is the source of
 * truth; `render()` is the only place that reconciles state → DOM (geometry,
 * z-index, active/minimized classes, launcher). Event handlers mutate
 * `state` and call `render()`; continuous gestures (drag/resize) apply one
 * window's geometry directly for smoothness. This kills the manual
 * multi-place sync the old imperative version needed.
 *
 * Invariants (proven in the POC, see MIGRATION_REVIEW.md):
 * - Windows keep STABLE DOM order; stacking is z-index only (reordering
 *   reloads iframes). Content is ADOPTED, never re-rendered or reparented.
 * - Client-opened windows get a DOM-built frame structurally identical to
 *   Window.astro (see FRAME_* below — keep the two in sync).
 * - Every post/legal window URL is a real prerendered page; pushState fires on
 *   focus CHANGES only; in-flight dedup; pointercancel-safe drags.
 */
import {
  AGENT_INTRO_SEEN_KEY,
  branchOf,
  clampCursor,
  clampMove,
  clampResize,
  clampWinToViewport,
  formatIsoDate,
  legalGeom,
  notFoundGeom,
  prsGeom,
  showGeom,
  STORAGE_KEY,
  termGeom,
  windowTitle,
} from '@/utils/retro';

import type { TermPost, WinGeom } from '@/utils/retro';

type Kind = 'term' | 'show' | 'legal' | 'prs' | 'not-found';

type GeometryMotion = {
  animations: Animation[];
  finish: () => void;
};

type StoredDesktopState = {
  cursor?: number;
  maximized?: boolean;
};

type Win = {
  id: string;
  kind: Kind;
  el: HTMLElement;
  url: string | null;
  geom: WinGeom;
  z: number;
  userResized: boolean;
  minimized: boolean;
  /** Geometry to restore after leaving the maximized state. */
  restoreGeom: WinGeom | null;
  geometryMotion: GeometryMotion | null;
  /** Element focused when this window opened, to restore focus on close. */
  opener: HTMLElement | null;
};

// --- Window frame chrome (client twin of Window.astro — keep in sync). The
// content and status nodes are inserted between the titlebar and the resize
// handle, matching Window.astro's [titlebar, <slot/>, <slot name=status/>,
// resize] child order exactly, so no wrapper element is needed. ---
function winTitleId(id: string): string {
  return `wintitle-${id.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
}
function frameTitlebar(id: string, title: string): string {
  const t = escapeHtml(title);
  return `
    <div class="retro-terminal-titlebar retro-only">
      <span class="retro-terminal-dots" aria-hidden="true"><span class="retro-terminal-dot"></span><span class="retro-terminal-dot"></span><span class="retro-terminal-dot"></span></span>
      <span class="retro-terminal-title-text" id="${winTitleId(id)}">${t}</span>
      <button class="retro-terminal-close" aria-label="Close ${t}">×</button>
    </div>`;
}
const FRAME_RESIZE =
  '<div class="retro-terminal-resize retro-only" aria-hidden="true">◢</div>';

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[c] ?? c,
  );
}

const desktop = document.querySelector<HTMLElement>('.retro-terminal-desktop');
const shell = document.querySelector<HTMLElement>('.retro-terminal-shell');

const vw = () => window.innerWidth;
const vh = () => window.innerHeight;
const isPhone = () => vw() < 640 || vh() <= 500;

const WINDOW_GEOMETRY_ANIMATION_ID = 'retro-terminal-window-geometry';

function maximizedGeom(): WinGeom {
  const inset = Math.round(
    Math.min(16, Math.max(12, Math.min(vw(), vh()) * 0.018)),
  );
  return {
    x: inset,
    y: inset,
    w: vw() - inset * 2,
    h: vh() - inset * 2,
  };
}

function finishGeometryMotion(win: Win) {
  const motion = win.geometryMotion;
  if (!motion) return;
  for (const animation of motion.animations) animation.finish();
  // `finish` events are queued, so commit synchronous state before the next
  // interaction decides whether it is maximizing or restoring.
  motion.finish();
}

function kindOf(id: string): Kind {
  if (id === 'term') return 'term';
  if (id === 'latest-prs') return 'prs';
  if (id === 'not-found') return 'not-found';
  if (id.startsWith('legal:')) return 'legal';
  return 'show';
}

function urlOf(id: string): string | null {
  if (id.startsWith('show:')) return `/blog/${id.slice(5)}`;
  if (id.startsWith('legal:')) return `/${id.slice(6)}`;
  if (id === 'not-found') return location.pathname;
  return '/';
}

/** Drag session with pointercancel-safe teardown. */
function trackDrag(
  event: PointerEvent,
  onMove: (dx: number, dy: number) => void,
) {
  const startX = event.clientX;
  const startY = event.clientY;
  const pointerId = event.pointerId;
  function move(ev: PointerEvent) {
    if (ev.pointerId !== pointerId) return;
    onMove(ev.clientX - startX, ev.clientY - startY);
  }
  function stop() {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', stop);
    window.removeEventListener('pointercancel', stop);
  }
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', stop);
  window.addEventListener('pointercancel', stop);
}

function copyMarkdown(
  slug: string,
  hint: Element | null,
  button?: HTMLButtonElement,
) {
  const setHint = (text: string) => {
    if (hint) hint.textContent = text;
  };
  setHint('copying…');
  if (button) {
    button.disabled = true;
    button.textContent = 'Copying';
  }
  fetch(`/blog/${slug}.md`)
    .then((r) => (r.ok ? r.text() : Promise.reject(new Error('bad'))))
    .then((text) => navigator.clipboard.writeText(text))
    .then(() => {
      setHint('copied to clipboard ✓');
      if (button) button.textContent = 'Copied';
    })
    .catch(() => {
      setHint('copy failed — try again');
      if (button) button.textContent = 'Retry';
    })
    .finally(() => {
      if (button) button.disabled = false;
      setTimeout(() => setHint('c copy markdown · esc close'), 2000);
    });
}

function readPostsIndex(): TermPost[] {
  const el = document.querySelector('[data-posts-index]');
  if (!el?.textContent) return [];
  try {
    return JSON.parse(el.textContent) as TermPost[];
  } catch {
    return [];
  }
}

const SKELETON = `
  <div class="retro-terminal-show-scroll"><div class="retro-terminal-loading-post" aria-busy="true">
    <div class="retro-terminal-show-meta">loading object from remote archive...</div>
    <div class="retro-terminal-skeleton-line retro-terminal-skeleton-line--wide"></div>
    <div class="retro-terminal-skeleton-line"></div>
    <div class="retro-terminal-skeleton-line retro-terminal-skeleton-line--short"></div>
    <div class="retro-terminal-skeleton-image"></div>
    <div class="retro-terminal-skeleton-line"></div>
    <div class="retro-terminal-skeleton-line retro-terminal-skeleton-line--wide"></div>
  </div></div>`;

/** Replace a window's body (everything between titlebar and resize handle). */
function setBody(el: HTMLElement, ...nodes: Array<Node | string>) {
  const titlebar = el.querySelector('.retro-terminal-titlebar');
  const resize = el.querySelector('.retro-terminal-resize');
  // Snapshot first — el.children is live and we remove while iterating.
  for (const child of Array.from(el.children)) {
    if (child !== titlebar && child !== resize) child.remove();
  }
  for (const node of nodes) {
    if (typeof node === 'string') {
      resize?.insertAdjacentHTML('beforebegin', node);
    } else {
      resize?.before(node);
    }
  }
}

function init(desktopEl: HTMLElement, shellEl: HTMLElement) {
  const storedState = (() => {
    try {
      return JSON.parse(
        localStorage.getItem(STORAGE_KEY) ?? '{}',
      ) as StoredDesktopState;
    } catch {
      return {};
    }
  })();
  const state = {
    windows: [] as Win[],
    focusedId: null as string | null,
    cursor: 0,
    maximized: storedState.maximized === true,
  };
  let zCounter = 0;
  const opening = new Set<string>();

  const posts = readPostsIndex();
  const rowEls = [
    ...desktopEl.querySelectorAll<HTMLElement>('[data-log-index]'),
  ];

  const winById = (id: string) => state.windows.find((w) => w.id === id);
  const nextZ = () => ++zCounter;

  function persistState() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ cursor: state.cursor, maximized: state.maximized }),
      );
    } catch {
      /* private mode */
    }
  }

  function persistMaximized(maximized: boolean) {
    state.maximized = maximized;
    persistState();
  }

  /** Top-most VISIBLE window (minimized windows are ignored for URL/focus). */
  function topWindow(): Win | null {
    let top: Win | null = null;
    for (const win of state.windows) {
      if (win.minimized) continue;
      if (!top || win.z > top.z) top = win;
    }
    return top;
  }

  function defaultGeom(id: string): WinGeom {
    const kind = kindOf(id);
    if (kind === 'term') return termGeom(vw(), vh(), posts);
    if (kind === 'show') return showGeom(vw(), vh());
    if (kind === 'prs') return prsGeom(vw(), vh());
    if (kind === 'not-found') return notFoundGeom(vw(), vh());
    return legalGeom(vw(), vh());
  }

  /** Apply a single window's geometry + z to the DOM (used during drag). */
  function applyGeom(win: Win) {
    win.el.style.zIndex = String(100 + win.z);
    if (isPhone()) {
      win.el.style.left = '';
      win.el.style.top = '';
      win.el.style.width = '';
      win.el.style.height = '';
      return;
    }
    win.el.style.left = `${win.geom.x}px`;
    win.el.style.top = `${win.geom.y}px`;
    win.el.style.width = `${win.geom.w}px`;
    win.el.style.height = `${win.geom.h}px`;
  }

  function startGeometryMotion(
    win: Win,
    animations: Animation[],
    onFinish?: () => void,
  ) {
    const motion: GeometryMotion = {
      animations,
      finish: () => {
        if (win.geometryMotion !== motion) return;
        win.geometryMotion = null;
        onFinish?.();
      },
    };
    animations[0].id = WINDOW_GEOMETRY_ANIMATION_ID;
    animations[0].addEventListener('finish', motion.finish, { once: true });
    animations[0].addEventListener(
      'cancel',
      () => {
        if (win.geometryMotion === motion) win.geometryMotion = null;
      },
      { once: true },
    );
    win.geometryMotion = motion;
  }

  function animateGeometryFade(win: Win) {
    startGeometryMotion(
      win,
      [
        win.el.animate([{ opacity: 0.85 }, { opacity: 1 }], {
          duration: 160,
          easing: 'cubic-bezier(0.23, 1, 0.32, 1)',
        }),
      ],
    );
  }

  function animateGeometryChange(
    win: Win,
    from: DOMRect,
    to: DOMRect,
    expanding: boolean,
    onFinish?: () => void,
  ) {
    const outer = expanding ? to : from;
    const inner = expanding ? from : to;
    const top = Math.max(0, inner.top - outer.top);
    const right = Math.max(0, outer.right - inner.right);
    const bottom = Math.max(0, outer.bottom - inner.bottom);
    const left = Math.max(0, inner.left - outer.left);
    const widthDelta = left + right;
    const inset = `inset(${top}px ${right}px ${bottom}px ${left}px)`;
    const frames = (collapsed: Keyframe, expanded: Keyframe) =>
      expanding ? [collapsed, expanded] : [expanded, collapsed];
    const options: KeyframeAnimationOptions = {
      duration: 240,
      easing: 'cubic-bezier(0.77, 0, 0.175, 1)',
    };
    const animations = [
      win.el.animate(
        frames({ clipPath: inset }, { clipPath: 'inset(0px)' }),
        options,
      ),
    ];

    const titlebar = win.el.querySelector('.retro-terminal-titlebar');
    if (titlebar) {
      animations.push(
        titlebar.animate(
          frames(
            { transform: `translate(${left}px, ${top}px)` },
            { transform: 'none' },
          ),
          options,
        ),
      );
    }
    const closeControl = win.el.querySelector('.retro-terminal-close');
    if (closeControl) {
      animations.push(
        closeControl.animate(
          frames(
            { transform: `translateX(${-widthDelta}px)` },
            { transform: 'none' },
          ),
          options,
        ),
      );
    }
    const status = win.el.querySelector('.retro-terminal-status');
    if (status) {
      animations.push(
        status.animate(
          frames(
            { transform: `translate(${left}px, ${-bottom}px)` },
            { transform: 'none' },
          ),
          options,
        ),
      );
    }
    const statusHint = win.el.querySelector('.retro-terminal-status-hint');
    if (statusHint) {
      animations.push(
        statusHint.animate(
          frames(
            { transform: `translateX(${-widthDelta}px)` },
            { transform: 'none' },
          ),
          options,
        ),
      );
    }

    startGeometryMotion(win, animations, onFinish);
  }

  /** The single reconcile point: state → DOM. Idempotent. */
  function render() {
    const phone = isPhone();
    const coveringZ = phone
      ? null
      : (state.windows
          .filter((win) => !win.minimized && win.restoreGeom !== null)
          .reduce<number | null>(
            (highest, win) => Math.max(highest ?? win.z, win.z),
            null,
          ) ?? null);
    const coveringWindow =
      coveringZ === null
        ? null
        : (state.windows.find((win) => win.z === coveringZ) ?? null);
    const activeWindow =
      document.activeElement instanceof Element
        ? windowFromEvent(document.activeElement)
        : null;
    if (
      coveringWindow &&
      (!activeWindow || activeWindow.z < coveringWindow.z)
    ) {
      coveringWindow.el.focus({ preventScroll: true });
    }
    for (const win of state.windows) {
      const maximized = !phone && win.restoreGeom !== null;
      win.el.classList.remove('retro-terminal-window--ssr');
      win.el.classList.toggle(
        'retro-terminal-window--minimized',
        win.minimized,
      );
      win.el.classList.toggle(
        'retro-terminal-window--maximized',
        maximized,
      );
      win.el.setAttribute('aria-hidden', win.minimized ? 'true' : 'false');
      win.el.setAttribute(
        'aria-roledescription',
        maximized ? 'Maximized window' : 'Window',
      );
      win.el.toggleAttribute(
        'inert',
        coveringZ !== null && win.z < coveringZ,
      );
      if (phone) win.el.removeAttribute('aria-keyshortcuts');
      else win.el.setAttribute('aria-keyshortcuts', 'Alt+Enter');
      applyGeom(win);
      const active = win.id === state.focusedId && !win.minimized;
      win.el.classList.toggle('retro-terminal-window--active', active);
      const titlebar = win.el.querySelector('.retro-terminal-titlebar');
      titlebar?.classList.toggle('retro-terminal-titlebar--active', active);
      if (phone) titlebar?.removeAttribute('title');
      else {
        titlebar?.setAttribute(
          'title',
          `Double-click to ${maximized ? 'restore' : 'maximize'} (Alt+Enter)`,
        );
      }
    }
    desktopEl.classList.toggle(
      'retro-terminal-desktop--empty',
      !state.windows.some((w) => !w.minimized),
    );
    const hasMaximizedWindow = coveringZ !== null;
    desktopEl.classList.toggle(
      'retro-terminal-desktop--window-maximized',
      hasMaximizedWindow,
    );
    ensureLauncher();
    for (const el of desktopEl.querySelectorAll<HTMLElement>(
      '.retro-terminal-profile, .retro-terminal-profile-toggle, .retro-terminal-profile-icon, .retro-terminal-footer, .retro-terminal-launcher, [data-reader-mode]',
    )) {
      el.toggleAttribute('inert', hasMaximizedWindow);
    }
    syncTitle();
  }

  function toggleMaximize(win: Win, options?: { animate?: boolean }) {
    if (isPhone() || win.minimized) return;

    finishGeometryMotion(win);
    const shouldAnimate = options?.animate !== false;
    const reduceMotion = matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    if (!shouldAnimate || reduceMotion) {
      if (win.restoreGeom) {
        win.geom = win.restoreGeom;
        win.restoreGeom = null;
      } else {
        win.restoreGeom = { ...win.geom };
        win.geom = maximizedGeom();
      }
      render();
      persistMaximized(win.restoreGeom !== null);
      if (shouldAnimate) animateGeometryFade(win);
      return;
    }

    if (win.restoreGeom) {
      const target = { ...win.restoreGeom };
      const from = win.el.getBoundingClientRect();
      const to = new DOMRect(target.x, target.y, target.w, target.h);
      animateGeometryChange(win, from, to, false, () => {
        win.geom = target;
        win.restoreGeom = null;
        render();
        persistMaximized(false);
      });
    } else {
      const from = win.el.getBoundingClientRect();
      win.restoreGeom = { ...win.geom };
      win.geom = maximizedGeom();
      render();
      persistMaximized(true);
      animateGeometryChange(
        win,
        from,
        win.el.getBoundingClientRect(),
        true,
      );
    }
  }

  /** Tab title tracks the focused window (RetroTerminal.tsx parity). */
  function syncTitle() {
    const HOME_TITLE =
      'Nicolas Charpentier — Frontend Infrastructure & Developer Tooling';
    const top = topWindow();
    let title = HOME_TITLE;
    if (top?.id === 'not-found') title = '404 — Page Not Found';
    else if (top?.id === 'legal:disclaimer') {
      title = 'Disclaimer | Nicolas Charpentier';
    } else if (top?.id === 'legal:privacy-policy') {
      title = 'Privacy Policy | Nicolas Charpentier';
    } else if (top?.id.startsWith('show:')) {
      const post = posts.find((p) => p.slug === top.id.slice(5));
      if (post) title = `${post.title} | Nicolas Charpentier`;
    }
    if (document.title !== title) document.title = title;
  }

  function syncUrl(mode: 'push' | 'replace') {
    const top = topWindow();
    const url = top ? urlOf(top.id) : '/';
    if (url === null || url === location.pathname) return;
    history[mode === 'push' ? 'pushState' : 'replaceState']({}, '', url);
  }

  /** When no window can take focus, park it on the launcher or reader-mode
   * button so keyboard focus never falls back to <body>. */
  function focusFallback() {
    const launcher = desktopEl.querySelector<HTMLElement>(
      '.retro-terminal-launcher',
    );
    const readerBtn = desktopEl.querySelector<HTMLElement>('[data-reader-mode]');
    (launcher ?? readerBtn)?.focus({ preventScroll: true });
  }

  /** Focus a window, restoring it if minimized. */
  function focus(win: Win, options?: { silentUrl?: boolean }) {
    const changed = state.focusedId !== win.id || win.minimized;
    win.minimized = false;
    state.focusedId = win.id;
    win.z = nextZ();
    render();
    persistMaximized(win.restoreGeom !== null);
    win.el.focus({ preventScroll: true });
    if (changed && !options?.silentUrl) syncUrl('replace');
  }

  function minimize(win: Win) {
    win.minimized = true;
    const wasFocused = state.focusedId === win.id;
    if (wasFocused) state.focusedId = topWindow()?.id ?? null;
    render();
    persistMaximized(topWindow()?.restoreGeom !== null);
    if (wasFocused) {
      const top = state.focusedId ? winById(state.focusedId) : null;
      if (top) top.el.focus({ preventScroll: true });
      else focusFallback();
    }
    syncUrl('replace');
  }

  function close(win: Win) {
    // The term window is home — closing it soft-minimizes (shows the
    // launcher) rather than destroying it, so it restores without a reload.
    if (win.kind === 'term') {
      minimize(win);
      return;
    }
    state.windows = state.windows.filter((w) => w !== win);
    win.el.remove();
    if (state.focusedId === win.id) state.focusedId = null;
    const top = topWindow();
    if (top) {
      state.focusedId = top.id;
      top.z = nextZ();
    }
    render();
    persistMaximized(top?.restoreGeom !== null);
    // Restore focus to whatever opened this window (e.g. the term-log row),
    // falling back to the new top window — important for keyboard users.
    let restoredOpenerFocus = false;
    if (
      win.opener?.isConnected &&
      win.opener.offsetParent !== null &&
      !win.opener.closest('[inert]')
    ) {
      win.opener.focus({ preventScroll: true });
      restoredOpenerFocus = document.activeElement === win.opener;
    }
    if (!restoredOpenerFocus && top) {
      top.el.focus({ preventScroll: true });
    } else if (!restoredOpenerFocus) {
      focusFallback();
    }
    syncUrl('replace');
  }

  /** Cycle focus across VISIBLE windows in stable creation order (F6);
   * minimized windows are skipped rather than popped back open. */
  function cycleWindows(dir: 1 | -1) {
    const visible = state.windows.filter((w) => !w.minimized);
    if (visible.length < 2) return;
    const idx = visible.findIndex((w) => w.id === state.focusedId);
    // If focus isn't on a visible window, start from the first.
    const from = idx < 0 ? 0 : idx;
    const next = visible[(from + dir + visible.length) % visible.length];
    focus(next);
  }

  function registerServerWindow(el: HTMLElement): Win {
    const id = el.dataset.retroWindowId ?? '';
    const initialGeom = defaultGeom(id);
    const win: Win = {
      id,
      kind: kindOf(id),
      el,
      url: urlOf(id),
      geom: state.maximized ? maximizedGeom() : initialGeom,
      z: nextZ(),
      userResized: false,
      minimized: false,
      restoreGeom: state.maximized ? initialGeom : null,
      geometryMotion: null,
      opener: null,
    };
    state.windows.push(win);
    return win;
  }

  // --- Client-opened window frames (twin of Window.astro) ---
  function buildFrame(id: string, title: string): Win {
    const initialGeom = defaultGeom(id);
    const inheritMaximized = topWindow()?.restoreGeom !== null;
    const el = document.createElement('div');
    el.className = 'retro-terminal-window';
    el.dataset.retroWindowId = id;
    el.tabIndex = 0;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-roledescription', 'Window');
    el.setAttribute('aria-labelledby', winTitleId(id));
    el.innerHTML = frameTitlebar(id, title) + FRAME_RESIZE;
    const readerBtn = desktopEl.querySelector('[data-reader-mode]');
    desktopEl.insertBefore(el, readerBtn);
    const win: Win = {
      id,
      kind: kindOf(id),
      el,
      url: urlOf(id),
      geom: inheritMaximized ? maximizedGeom() : initialGeom,
      z: nextZ(),
      userResized: false,
      minimized: false,
      restoreGeom: inheritMaximized ? initialGeom : null,
      geometryMotion: null,
      opener:
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null,
    };
    state.windows.push(win);
    return win;
  }

  async function openPartialWindow(
    id: string,
    partialPath: string,
    statusHtml: string,
  ) {
    const existing = winById(id);
    if (existing) {
      // A window left in an error state (a prior fetch failed) is discarded so
      // this open re-attempts the fetch instead of just re-focusing the error.
      if (existing.el.dataset.error) {
        state.windows = state.windows.filter((w) => w !== existing);
        existing.el.remove();
        if (state.focusedId === id) state.focusedId = null;
      } else {
        focus(existing);
        return;
      }
    }
    if (opening.has(id)) return;
    opening.add(id);
    try {
      const win = buildFrame(id, windowTitle(id, posts));
      setBody(win.el, SKELETON);
      focus(win, { silentUrl: true });
      syncUrl('push');
      const response = await fetch(partialPath);
      if (!response.ok) throw new Error(String(response.status));
      const doc = new DOMParser().parseFromString(
        await response.text(),
        'text/html',
      );
      // Posts with interactive React islands (Sandpack) can't hydrate inside
      // adopted DOM — open them as a full navigation to the server-rendered
      // page, where the terminal re-renders with this window focused and the
      // island hydrated. But only if this window is still the focused one — if
      // the user moved to another window during the load, don't yank the page.
      const navUrl = urlOf(id);
      if (navUrl && doc.querySelector('astro-island')) {
        if (state.focusedId === id) {
          location.assign(navUrl);
        } else if (winById(id)) {
          close(win);
        }
        return;
      }
      const root = doc.querySelector('[data-window-content]');
      if (!root) throw new Error('malformed partial');
      setBody(win.el, document.adoptNode(root), statusHtml);
      // Let the page-level enhancers decorate the adopted content (copy
      // buttons, Giscus) — adopted DOM never ran its own scripts.
      document.dispatchEvent(
        new CustomEvent('os:window-opened', { detail: { root: win.el } }),
      );
    } catch {
      const win = winById(id);
      if (win) {
        win.el.dataset.error = '1';
        setBody(
          win.el,
          '<div class="retro-terminal-show-scroll"><div class="retro-terminal-show-meta">error: could not load — reopen to retry</div></div>',
        );
      }
    } finally {
      opening.delete(id);
    }
  }

  function openShow(slug: string) {
    const post = posts.find((p) => p.slug === slug);
    const branch = post ? branchOf(post) : undefined;
    void openPartialWindow(
      `show:${slug}`,
      `/blog/${slug}/content`,
      `<div class="retro-terminal-status retro-only"><span>branch <b>${branch ? `refs/heads/${branch}` : 'main'}</b></span><span class="retro-terminal-status-hint" data-show-status-hint aria-live="polite">c copy markdown · esc close</span></div>`,
    );
  }

  function openLegal(variant: 'disclaimer' | 'privacy-policy') {
    void openPartialWindow(
      `legal:${variant}`,
      `/partials/legal-${variant}`,
      `<div class="retro-terminal-status retro-only"><span><b>${variant}</b></span><span class="retro-terminal-status-hint">esc close · drag ◢ to resize</span></div>`,
    );
  }

  function openPrs() {
    const existing = winById('latest-prs');
    if (existing) {
      focus(existing);
      return;
    }
    const win = buildFrame('latest-prs', windowTitle('latest-prs', posts));
    const body = document.createElement('div');
    body.className = 'retro-terminal-prs-window';
    body.innerHTML = `
      <div class="retro-terminal-prs-toolbar">
        <span>latest open source contributions</span>
        <a href="https://prs.charpeni.com" target="_blank" rel="noopener noreferrer">Open latest PRs ↗</a>
      </div>
      <div class="retro-terminal-prs-list"><div class="retro-terminal-prs-message">Fetching recent pull requests...</div></div>`;
    setBody(win.el, body);
    focus(win, { silentUrl: true });
    const list = body.querySelector('.retro-terminal-prs-list');
    fetch('/api/latestPrs')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('bad'))))
      .then((data: { prs: Array<Record<string, string | number>> }) => {
        if (!list) return;
        list.innerHTML = '';
        for (const pr of data.prs) {
          const row = document.createElement('a');
          row.className = 'retro-terminal-prs-row';
          row.href = String(pr.url);
          row.target = '_blank';
          row.rel = 'noopener noreferrer';
          const number = document.createElement('span');
          number.className = 'retro-terminal-prs-number';
          number.textContent = String(pr.number);
          const copy = document.createElement('span');
          copy.className = 'retro-terminal-prs-copy';
          const title = document.createElement('span');
          title.className = 'retro-terminal-prs-title';
          title.textContent = String(pr.title);
          const repo = document.createElement('span');
          repo.className = 'retro-terminal-prs-repo';
          repo.textContent = `${pr.repo} · ${formatIsoDate(String(pr.publishedAt))}`;
          copy.append(title, repo);
          row.append(number, copy);
          list.appendChild(row);
        }
      })
      .catch(() => {
        if (list) {
          list.innerHTML =
            '<div class="retro-terminal-prs-message">Could not load the feed. Use the external link above.</div>';
        }
      });
  }

  function ensureLauncher() {
    const termVisible = state.windows.some(
      (w) => w.kind === 'term' && !w.minimized,
    );
    const existing = desktopEl.querySelector('.retro-terminal-launcher');
    if (termVisible) {
      existing?.remove();
      return;
    }
    if (existing) return;
    const launcher = document.createElement('button');
    launcher.type = 'button';
    launcher.className = 'retro-terminal-launcher retro-only';
    launcher.setAttribute('aria-label', 'Open blog archive terminal');
    launcher.innerHTML = `
      <span class="retro-terminal-launcher-glyph" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="14" rx="2"/><path d="m6 9 3 3-3 3"/><path d="M13 15h4"/></svg>
      </span>
      <span class="retro-terminal-launcher-label">archive agent</span>`;
    launcher.addEventListener('click', () => {
      const term = winById('term');
      if (term) focus(term); // restore the minimized term — no reload
      else location.assign('/');
    });
    desktopEl.appendChild(launcher);
  }

  // --- Term cursor ---
  // `moveFocus` moves DOM focus onto the selected row (roving focus for
  // keyboard nav), so screen readers announce it naturally and focus stays in
  // sync with the visual cursor. Not used on the initial seed or mouse-select.
  function setCursor(
    next: number,
    options?: { scroll?: boolean; moveFocus?: boolean },
  ) {
    state.cursor = clampCursor(next, posts.length);
    for (const row of rowEls) {
      const selected = Number(row.dataset.logIndex) === state.cursor;
      row.classList.toggle('retro-terminal-row--selected', selected);
      if (selected) {
        row.setAttribute('aria-current', 'true');
        if (options?.moveFocus) row.focus();
        else if (options?.scroll !== false) {
          row.scrollIntoView({ block: 'nearest' });
        }
      } else {
        row.removeAttribute('aria-current');
      }
    }
    const display = desktopEl.querySelector('[data-cursor-display]');
    if (display) {
      display.textContent = String(state.cursor + 1).padStart(2, '0');
    }
    const branchDisplay = desktopEl.querySelector('[data-status-branch]');
    if (branchDisplay) {
      const post = posts[state.cursor];
      branchDisplay.textContent = (post && branchOf(post)) || 'main';
    }
    const selectedDisplay = desktopEl.querySelector('[data-status-selected]');
    if (selectedDisplay) {
      selectedDisplay.textContent = String(state.cursor + 1);
    }
    persistState();
  }

  // --- Adopt server-rendered windows ---
  for (const el of desktopEl.querySelectorAll<HTMLElement>(
    '.retro-terminal-window',
  )) {
    registerServerWindow(el);
  }
  {
    const activeEl = desktopEl.querySelector<HTMLElement>(
      '.retro-terminal-window--active',
    );
    const active = activeEl?.dataset.retroWindowId
      ? winById(activeEl.dataset.retroWindowId)
      : null;
    if (active) {
      state.focusedId = active.id;
      active.z = nextZ();
    }
  }

  // Initial cursor: a deep-linked post wins over the stored cursor.
  {
    const match = location.pathname.match(/^\/blog\/([^/.]+)$/);
    let initial = match ? posts.findIndex((p) => p.slug === match[1]) : -1;
    if (
      initial < 0 &&
      typeof storedState.cursor === 'number' &&
      storedState.cursor >= 0 &&
      storedState.cursor < posts.length
    ) {
      initial = storedState.cursor;
    }
    setCursor(Math.max(0, initial), { scroll: false });
  }

  render();

  // --- Events ---
  function windowFromEvent(target: Element): Win | null {
    const el = target.closest<HTMLElement>('[data-retro-window-id]');
    return el?.dataset.retroWindowId
      ? (winById(el.dataset.retroWindowId) ?? null)
      : null;
  }

  desktopEl.addEventListener('pointerdown', (event) => {
    const target = event.target as Element;
    const win = windowFromEvent(target);
    if (!win) return;
    if (state.focusedId !== win.id) {
      focus(win);
    } else {
      win.z = nextZ();
      applyGeom(win);
    }

    if (target.closest('.retro-terminal-close')) {
      return;
    }

    if (
      target.closest('.retro-terminal-titlebar') &&
      !isPhone() &&
      !win.restoreGeom
    ) {
      finishGeometryMotion(win);
      const origin = { ...win.geom };
      trackDrag(event, (dx, dy) => {
        Object.assign(win.geom, clampMove(origin, dx, dy, vw(), vh()));
        applyGeom(win);
      });
    } else if (
      target.closest('.retro-terminal-resize') &&
      !isPhone() &&
      !win.restoreGeom
    ) {
      finishGeometryMotion(win);
      const origin = { ...win.geom };
      event.preventDefault();
      trackDrag(event, (dx, dy) => {
        Object.assign(win.geom, clampResize(origin, dx, dy, vw(), vh(), win.id));
        win.userResized = true;
        applyGeom(win);
      });
    }
  });

  desktopEl.addEventListener('click', (event) => {
    const target = event.target as Element;

    const closeButton = target.closest('.retro-terminal-close');
    if (closeButton) {
      const win = windowFromEvent(closeButton);
      if (win) close(win);
      return;
    }

    const legalLink = target.closest<HTMLElement>('[data-open-legal]');
    if (legalLink) {
      event.preventDefault();
      openLegal(legalLink.dataset.openLegal as 'disclaimer' | 'privacy-policy');
      return;
    }

    if (target.closest('[data-open-prs]')) {
      event.preventDefault();
      openPrs();
      return;
    }

    if (target.closest('[data-reader-mode]')) {
      document.cookie = 'retro-os=0; path=/; max-age=31536000; samesite=lax';
      location.reload();
      return;
    }

    const profileToggle = target.closest('[data-profile-toggle]');
    if (profileToggle) {
      const open = desktopEl.classList.toggle(
        'retro-terminal-desktop--profile-open',
      );
      desktopEl
        .querySelector('#retro-mobile-profile')
        ?.classList.toggle('retro-terminal-profile--mobile-open', open);
      profileToggle.setAttribute('aria-expanded', String(open));
      const label = profileToggle.querySelector('[data-profile-label]');
      if (label) label.textContent = open ? 'Close [-]' : 'About [+]';
      return;
    }

    const copyMobile = target.closest<HTMLButtonElement>(
      '[data-copy-markdown]',
    );
    if (copyMobile) {
      const win = windowFromEvent(copyMobile);
      copyMarkdown(
        copyMobile.dataset.copyMarkdown ?? '',
        win?.el.querySelector('[data-show-status-hint]') ?? null,
        copyMobile,
      );
      return;
    }

    const row = target.closest<HTMLElement>('[data-log-index]');
    if (row) {
      event.preventDefault();
      const index = Number(row.dataset.logIndex);
      setCursor(index);
      if (isPhone()) openShow(row.dataset.logSlug ?? '');
      return;
    }
  });

  desktopEl.addEventListener('dblclick', (event) => {
    const target = event.target as Element;
    const row = target.closest<HTMLElement>('[data-log-index]');
    if (row) {
      event.preventDefault();
      openShow(row.dataset.logSlug ?? '');
      return;
    }
    if (
      target.closest('.retro-terminal-titlebar') &&
      !target.closest('.retro-terminal-close')
    ) {
      const win = windowFromEvent(target);
      if (win) {
        event.preventDefault();
        toggleMaximize(win);
      }
    }
  });

  // Intercept internal post links anywhere in the shell (incl. adopted
  // article content) — open windows instead of navigating.
  shellEl.addEventListener(
    'click',
    (event) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      const anchor = (event.target as Element).closest<HTMLAnchorElement>(
        'a[href]',
      );
      if (!anchor || anchor.closest('[data-log-index]')) return;
      const href = anchor.getAttribute('href') ?? '';
      // Legal cross-links (e.g. the privacy body linking the disclaimer)
      // open the sibling window in place (LegalWindow.tsx parity).
      const legal = href.match(/^\/(disclaimer|privacy-policy)$/);
      if (legal) {
        event.preventDefault();
        openLegal(legal[1] as 'disclaimer' | 'privacy-policy');
        return;
      }
      const match = href.match(/^\/blog\/([^/.]+)$/);
      if (!match) return;
      event.preventDefault();
      openShow(match[1]);
    },
    true,
  );

  document.addEventListener('keydown', (event) => {
    const target = event.target as HTMLElement;

    if (event.altKey && event.key === 'Enter') {
      const targetWin =
        target instanceof Element ? windowFromEvent(target) : null;
      if (targetWin && !isPhone()) {
        event.preventDefault();
        if (state.focusedId !== targetWin.id) focus(targetWin);
        toggleMaximize(targetWin, { animate: false });
        return;
      }
    }

    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      return;
    }

    // F6 / Shift+F6 cycles focus across open windows (standard pane-cycle
    // key) — keyboard users can reach any window regardless of DOM order.
    if (event.key === 'F6') {
      event.preventDefault();
      cycleWindows(event.shiftKey ? -1 : 1);
      return;
    }

    if (event.key === 'Escape') {
      const win = state.focusedId ? winById(state.focusedId) : null;
      // Escape closes the focused window (production parity: the term
      // included — close() soft-minimizes it, revealing the launcher).
      if (win) {
        event.preventDefault();
        close(win);
      }
      return;
    }

    const focused = state.focusedId ? winById(state.focusedId) : null;
    if (focused?.kind === 'term') {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        setCursor(state.cursor + (event.key === 'ArrowDown' ? 1 : -1), {
          moveFocus: true,
        });
      } else if (event.key === 'Enter') {
        event.preventDefault();
        const post = posts[state.cursor];
        if (post) openShow(post.slug);
      }
    } else if (
      focused?.kind === 'show' &&
      event.key === 'c' &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey
    ) {
      event.preventDefault();
      copyMarkdown(
        focused.id.slice(5),
        focused.el.querySelector('[data-show-status-hint]'),
      );
    }
  });

  window.addEventListener('popstate', () => {
    const path = location.pathname;
    const showMatch = path.match(/^\/blog\/([^/.]+)$/);
    if (showMatch) {
      const win = winById(`show:${showMatch[1]}`);
      if (win) focus(win, { silentUrl: true });
      else openShow(showMatch[1]);
      return;
    }
    if (path === '/disclaimer' || path === '/privacy-policy') {
      openLegal(path.slice(1) as 'disclaimer' | 'privacy-policy');
      return;
    }
    if (path === '/') {
      const term = winById('term');
      if (term) focus(term, { silentUrl: true });
      else location.reload();
      return;
    }
    location.reload();
  });

  let resizePending = false;
  window.addEventListener('resize', () => {
    if (resizePending) return;
    resizePending = true;
    requestAnimationFrame(() => {
      resizePending = false;
      for (const win of state.windows) {
        finishGeometryMotion(win);
        if (win.restoreGeom) {
          win.restoreGeom =
            win.kind === 'term' && !win.userResized
              ? termGeom(vw(), vh(), posts)
              : clampWinToViewport(
                  { id: win.id, z: win.z, ...win.restoreGeom },
                  vw(),
                  vh(),
                );
          win.geom = maximizedGeom();
        } else if (win.kind === 'term' && !win.userResized) {
          win.geom = termGeom(vw(), vh(), posts);
        } else {
          win.geom = clampWinToViewport(
            { id: win.id, z: win.z, ...win.geom },
            vw(),
            vh(),
          );
        }
      }
      render();
    });
  });

  (window as unknown as { __osReady: boolean }).__osReady = true;

  playAgentIntro(desktopEl);
}

/**
 * The "archive agent" intro — a vanilla port of GraphLog.tsx's three-phase
 * sequence (thinking 900ms → indexing 2100ms → tool 3800ms → done). The
 * server renders the DONE state (crawlers and no-JS visitors always see the
 * finished log); this rewinds and replays it once per browser. Skipped on
 * mobile (<900px), for prefers-reduced-motion, and after first view
 * (AGENT_INTRO_SEEN_KEY). Click or any key skips.
 */
function playAgentIntro(desktopEl: HTMLElement) {
  const seen = (() => {
    try {
      return localStorage.getItem(AGENT_INTRO_SEEN_KEY) === '1';
    } catch {
      return false;
    }
  })();
  if (
    seen ||
    window.innerWidth < 900 ||
    matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    return;
  }

  const term = desktopEl.querySelector<HTMLElement>(
    '[data-retro-window-id="term"]',
  );
  const agent = term?.querySelector<HTMLElement>('.retro-terminal-agent');
  const step = agent?.querySelector<HTMLElement>(
    '.retro-terminal-agent-step span:last-child',
  );
  const tool = agent?.querySelector<HTMLElement>('.retro-terminal-agent-tool');
  const cmd = tool?.querySelector<HTMLElement>('.retro-terminal-prompt-cmd');
  const meta = term?.querySelector<HTMLElement>('.retro-terminal-prompt-meta');
  const content = term?.querySelector<HTMLElement>('.retro-terminal-content');
  if (!term || !agent || !step || !tool || !cmd || !meta || !content) return;

  const DOTS = '<span class="retro-terminal-agent-dots" aria-hidden="true"></span>';
  const DONE_STEP = step.textContent ?? 'Archive mapped to commit log';
  const DONE_CMD = '$ git log --graph --oneline --all --date=short';

  const loading = document.createElement('div');
  loading.className = 'retro-terminal-content retro-terminal-content--loading';
  loading.tabIndex = 0;
  loading.setAttribute('role', 'button');
  loading.setAttribute('aria-label', 'Skip intro');
  loading.innerHTML =
    `<span class="retro-terminal-loading-line"></span>` +
    `<span class="retro-terminal-loading-skip" aria-hidden="true">click or press any key to skip</span>`;
  const loadingLine = loading.querySelector<HTMLElement>(
    '.retro-terminal-loading-line',
  );

  const timers: ReturnType<typeof setTimeout>[] = [];
  let done = false;

  function setPhase(phase: 'thinking' | 'indexing' | 'tool') {
    const pending = phase !== 'tool';
    step!.innerHTML =
      (phase === 'thinking'
        ? 'Reading archive intent and route context'
        : phase === 'indexing'
          ? 'Indexing posts, dates, and branch tags'
          : DONE_STEP) + (pending ? DOTS : '');
    tool!.classList.toggle('retro-terminal-agent-tool--pending', pending);
    cmd!.innerHTML = pending ? 'queued' : DONE_CMD + DOTS;
    if (loadingLine) {
      loadingLine.innerHTML =
        (phase === 'thinking'
          ? 'Planning archive query'
          : phase === 'indexing'
            ? 'Preparing graph lanes'
            : 'Running archive.list_posts') + DOTS;
    }
  }

  function finish() {
    if (done) return;
    done = true;
    for (const t of timers) clearTimeout(t);
    try {
      localStorage.setItem(AGENT_INTRO_SEEN_KEY, '1');
    } catch {
      /* private mode */
    }
    step!.textContent = DONE_STEP;
    tool!.classList.remove('retro-terminal-agent-tool--pending');
    cmd!.textContent = DONE_CMD;
    loading.remove();
    meta!.style.removeProperty('display');
    content!.style.removeProperty('display');
    window.removeEventListener('keydown', onKeyDown, true);
  }

  function onKeyDown(event: KeyboardEvent) {
    if (['Meta', 'Control', 'Alt', 'Shift'].includes(event.key)) return;
    // The skip keypress must not also activate the term (production's Enter
    // handler lived on the log element, so during the intro Enter could
    // never open a post — our document-level handler needs the stop).
    if (event.key === 'Enter') event.stopPropagation();
    finish();
  }

  meta.style.display = 'none';
  content.style.display = 'none';
  content.before(loading);
  setPhase('thinking');
  agent.addEventListener('click', finish);
  loading.addEventListener('click', finish);
  window.addEventListener('keydown', onKeyDown, true);
  timers.push(
    setTimeout(() => setPhase('indexing'), 900),
    setTimeout(() => setPhase('tool'), 2100),
    setTimeout(finish, 3800),
  );
}

if (desktop && shell && document.documentElement.dataset.reader !== 'true') {
  init(desktop, shell);
}
