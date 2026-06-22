import { computeGraph, isBranchTag, shortHash } from '@/utils/graph';
import type { PostFrontMatter } from '@/utils/mdx';

import { formatIsoDate } from './format';

import type { WinGeom, WinState } from './types';

export const MIN_W = 240;
export const MIN_H = 140;
const MAX_WINDOW_VH = 0.8;
const LEGACY_SHOW_WINDOW_W = 842;
export const PRS_WINDOW_MAX_H = 720;
const ROW_CHAR_W = 7.8;
const TERM_CHROME_W = 112;
export const GRAPH_MAIN_X = 7;
export const GRAPH_LANE_GAP = 18;
export const GRAPH_ROW_H = 22;

export function graphWidth(laneCount: number): number {
  return GRAPH_MAIN_X * 2 + laneCount * GRAPH_LANE_GAP;
}

function termFitWidth(posts: PostFrontMatter[]): number {
  const graph = computeGraph(posts, posts);
  let maxChars = 0;
  for (const post of posts) {
    const branch = post.tags.find((t) => isBranchTag(t));
    const refs = branch ? `(${branch}) ` : '';
    maxChars = Math.max(maxChars, `${shortHash(post.slug)} ${formatIsoDate(post.publishedAt)} ${refs}${post.title}`.length);
  }
  return Math.ceil(maxChars * ROW_CHAR_W + graphWidth(graph.activeBranches.length) + TERM_CHROME_W);
}

export function maxWindowHeight(vh: number): number {
  return Math.max(1, Math.floor(vh * MAX_WINDOW_VH));
}

function clampWindowHeight(vh: number, h: number): number {
  return Math.min(Math.max(MIN_H, h), maxWindowHeight(vh));
}

export function termGeom(vw: number, vh: number, posts: PostFrontMatter[]): WinGeom {
  const maxW = Math.max(MIN_W, vw - 40);
  const targetW = Math.min(Math.round(vw * 0.8), termFitWidth(posts));
  const w = Math.min(maxW, Math.max(MIN_W, targetW));
  const h = clampWindowHeight(vh, Math.min(vh - 80, 620));
  return { x: Math.round((vw - w) / 2), y: Math.max(20, Math.round((vh - h) / 2)), w, h };
}

export function showGeom(vw: number, vh: number): WinGeom {
  const TERMINAL_ARTICLE_W = 840;
  const SHOW_CHROME_W = 74;
  const maxW = TERMINAL_ARTICLE_W + SHOW_CHROME_W;
  const w = Math.max(MIN_W, Math.min(maxW, vw - 48));
  const h = clampWindowHeight(vh, vh - 40);
  return { x: Math.max(20, Math.round((vw - w) / 2)), y: Math.max(20, Math.round((vh - h) / 2)), w, h };
}

export function prsGeom(vw: number, vh: number): WinGeom {
  const w = Math.max(MIN_W, Math.min(920, vw - 48));
  const h = clampWindowHeight(vh, Math.min(PRS_WINDOW_MAX_H, vh - 64));
  return { x: Math.max(20, Math.round((vw - w) / 2)), y: Math.max(20, Math.round((vh - h) / 2)), w, h };
}

export function legalGeom(vw: number, vh: number): WinGeom {
  const w = Math.max(MIN_W, Math.min(740, vw - 48));
  const h = clampWindowHeight(vh, Math.min(620, Math.round(vh * 0.78), vh - 64));
  return { x: Math.max(20, Math.round((vw - w) / 2)), y: Math.max(20, Math.round((vh - h) / 2)), w, h };
}

export function clampWinToViewport(win: WinState, vw: number, vh: number): WinState {
  const h = Math.min(win.h, maxWindowHeight(vh));
  if (win.id.startsWith('show:') && vw >= 640 && win.w < 640) {
    return { ...win, ...showGeom(vw, vh) };
  }
  const targetW = win.id.startsWith('show:') && win.w >= LEGACY_SHOW_WINDOW_W ? Math.max(win.w, showGeom(vw, vh).w) : win.w;
  const w = Math.max(MIN_W, Math.min(targetW, vw - win.x));
  const x = Math.max(0, Math.min(win.x, vw - Math.min(w, 40)));
  const y = Math.max(0, Math.min(win.y, vh - h));
  return { ...win, x, y, w, h };
}
