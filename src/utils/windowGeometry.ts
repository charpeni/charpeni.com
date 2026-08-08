/**
 * Pure window geometry — sizing, positioning, and clamps for the terminal
 * window manager. Deliberately dependency-free (no graph, no date-fns, no DOM)
 * so it is unit-testable under `node --test` (see tests/retroGeometry.test.mjs)
 * and reusable. Terminal-domain logic that needs the git-graph or dates
 * (termGeom, windowTitle, …) lives in retro.ts, which re-exports this module.
 */

export type WinGeom = { x: number; y: number; w: number; h: number };
export type WinState = WinGeom & { id: string; z: number };

export const MIN_W = 240;
export const MIN_H = 140;
export const MAX_WINDOW_VH = 0.8;
export const LEGACY_SHOW_WINDOW_W = 842;
export const PRS_WINDOW_MAX_H = 720;
export const PRS_WINDOW_ID = 'latest-prs';
export const GRAPH_MAIN_X = 7;
export const GRAPH_LANE_GAP = 18;
export const GRAPH_ROW_H = 22;

export function graphWidth(laneCount: number): number {
  return GRAPH_MAIN_X * 2 + laneCount * GRAPH_LANE_GAP;
}

export function maxWindowHeight(vh: number): number {
  return Math.max(1, Math.floor(vh * MAX_WINDOW_VH));
}

export function clampWindowHeight(vh: number, h: number): number {
  return Math.min(Math.max(MIN_H, h), maxWindowHeight(vh));
}

export function showGeom(vw: number, vh: number): WinGeom {
  const TERMINAL_ARTICLE_W = 840;
  const SHOW_CHROME_W = 74;
  const maxW = TERMINAL_ARTICLE_W + SHOW_CHROME_W;
  const w = Math.max(MIN_W, Math.min(maxW, vw - 48));
  const h = clampWindowHeight(vh, vh - 40);
  return {
    x: Math.max(20, Math.round((vw - w) / 2)),
    y: Math.max(20, Math.round((vh - h) / 2)),
    w,
    h,
  };
}

export function prsGeom(vw: number, vh: number): WinGeom {
  const w = Math.max(MIN_W, Math.min(920, vw - 48));
  const h = clampWindowHeight(vh, Math.min(PRS_WINDOW_MAX_H, vh - 64));
  return {
    x: Math.max(20, Math.round((vw - w) / 2)),
    y: Math.max(20, Math.round((vh - h) / 2)),
    w,
    h,
  };
}

export function legalGeom(vw: number, vh: number): WinGeom {
  const w = Math.max(MIN_W, Math.min(740, vw - 48));
  const h = clampWindowHeight(
    vh,
    Math.min(620, Math.round(vh * 0.78), vh - 64),
  );
  return {
    x: Math.max(20, Math.round((vw - w) / 2)),
    y: Math.max(20, Math.round((vh - h) / 2)),
    w,
    h,
  };
}

export function notFoundGeom(vw: number, vh: number): WinGeom {
  const w = Math.max(MIN_W, Math.min(620, vw - 40));
  const h = clampWindowHeight(vh, Math.min(330, vh - 48));
  return {
    x: Math.max(16, Math.round((vw - w) / 2)),
    y: Math.max(16, Math.round((vh - h) / 2)),
    w,
    h,
  };
}

/** New top-left after a titlebar drag, clamped so the window can't leave the
 * viewport entirely. Pure — unit-tested. */
export function clampMove(
  origin: WinGeom,
  dx: number,
  dy: number,
  vw: number,
  vh: number,
): { x: number; y: number } {
  return {
    x: Math.max(0, Math.min(origin.x + dx, vw - 40)),
    y: Math.max(0, Math.min(origin.y + dy, vh - 24)),
  };
}

/** New size after a resize-handle drag, clamped to min sizes and the viewport
 * (the PRS window keeps its own max height). Pure — unit-tested. */
export function clampResize(
  origin: WinGeom,
  dx: number,
  dy: number,
  vw: number,
  vh: number,
  id: string,
): { w: number; h: number } {
  const maxH = Math.min(
    maxWindowHeight(vh),
    id === PRS_WINDOW_ID ? PRS_WINDOW_MAX_H : vh,
    vh - origin.y,
  );
  return {
    w: Math.max(MIN_W, Math.min(origin.w + dx, vw - origin.x)),
    h: Math.min(Math.max(MIN_H, origin.h + dy), maxH),
  };
}

/** Clamp a cursor index into [0, length-1] (empty list → 0). Pure. */
export function clampCursor(next: number, length: number): number {
  if (length <= 0) return 0;
  return Math.max(0, Math.min(next, length - 1));
}

/** Re-fit a window into the viewport after a resize (show windows widen to
 * the article width when the viewport allows). Pure. */
export function clampWinToViewport(
  win: WinState,
  vw: number,
  vh: number,
): WinState {
  const h = Math.min(win.h, maxWindowHeight(vh));
  if (win.id.startsWith('show:') && vw >= 640 && win.w < 640) {
    return { ...win, ...showGeom(vw, vh) };
  }
  const targetW =
    win.id.startsWith('show:') && win.w >= LEGACY_SHOW_WINDOW_W
      ? Math.max(win.w, showGeom(vw, vh).w)
      : win.w;
  const w = Math.max(MIN_W, Math.min(targetW, vw - win.x));
  const x = Math.max(0, Math.min(win.x, vw - Math.min(w, 40)));
  const y = Math.max(0, Math.min(win.y, vh - h));
  return { ...win, x, y, w, h };
}
