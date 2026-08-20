import { format, parseISO } from 'date-fns';

import { computeGraph, isBranchTag, shortHash } from '@/utils/graph';

import { clampWindowHeight, graphWidth, MIN_W } from './windowGeometry';

import type { WinGeom } from './windowGeometry';

// Re-export the pure geometry module so existing importers of '@/utils/retro'
// keep working (the manager pulls both geometry and terminal-domain helpers
// from here).
export * from './windowGeometry';

/**
 * Terminal-domain utilities, ported verbatim from
 * components/retro-terminal/{ids,format,postUtils,geometry}.ts — one module
 * now that the window manager is a single island.
 */

export type TermPost = {
  slug: string;
  title: string;
  publishedAt: string;
  tags: string[];
  readingTimeText: string;
  image?: string;
};

// --- ids.ts ---
export const TERM_ID = 'term';
export const PRS_ID = 'latest-prs';
export const NOT_FOUND_ID = 'not-found';
export const STORAGE_KEY = 'retro-terminal-state:v1';
export const AGENT_INTRO_SEEN_KEY = 'retro-terminal-agent-intro-seen:v1';

export type LegalWindowVariant = 'disclaimer' | 'privacy-policy';
export const showWinId = (slug: string) => `show:${slug}`;
export const legalWinId = (variant: LegalWindowVariant) => `legal:${variant}`;

// --- format.ts ---
export function formatIsoDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().slice(0, 10);
}

export function formatLongDate(iso: string): string {
  const d = parseISO(iso);
  return Number.isNaN(d.getTime()) ? iso : format(d, 'MMMM dd, yyyy');
}

// --- postUtils.ts ---
export const BRANCH_COLORS: Record<string, string> = {
  graphql: '#3b8a9e',
  homelab: '#7c5e9e',
  react: '#9a4f00',
  testing: '#3b6db8',
  tooling: '#a8443a',
  typescript: '#4a7c3a',
};
export const FALLBACK_BRANCH_COLOR = '#b45309';

export const isBranch = (tag: string) => isBranchTag(tag);
export const branchOf = (post: { tags: string[] }) =>
  post.tags.find((t) => isBranch(t));

// --- geometry.ts (terminal-specific; the pure geometry is in
// windowGeometry.ts, re-exported above) ---
const ROW_CHAR_W = 7.8;
const TERM_CHROME_W = 112;

function termFitWidth(posts: TermPost[]): number {
  const graph = computeGraph(posts, posts);
  let maxChars = 0;
  for (const post of posts) {
    const branch = post.tags.find((t) => isBranchTag(t));
    const refs = branch ? `(${branch}) ` : '';
    maxChars = Math.max(
      maxChars,
      `${shortHash(post.slug)} ${formatIsoDate(post.publishedAt)} ${refs}${post.title}`
        .length,
    );
  }
  return Math.ceil(
    maxChars * ROW_CHAR_W +
      graphWidth(graph.activeBranches.length) +
      TERM_CHROME_W,
  );
}

export function termGeom(vw: number, vh: number, posts: TermPost[]): WinGeom {
  const maxW = Math.max(MIN_W, vw - 40);
  const targetW = Math.min(Math.round(vw * 0.8), termFitWidth(posts));
  const w = Math.min(maxW, Math.max(MIN_W, targetW));
  const h = clampWindowHeight(vh, Math.min(vh - 80, 620));
  return {
    x: Math.round((vw - w) / 2),
    y: Math.max(20, Math.round((vh - h) / 2)),
    w,
    h,
  };
}
// --- window titles (RetroTerminal.tsx) ---
export function windowTitle(
  id: string,
  posts: TermPost[],
): string {
  if (id === TERM_ID) return "ssh blog@charpeni.com 'archive agent'";
  if (id === PRS_ID) return 'open https://prs.charpeni.com';
  if (id === NOT_FOUND_ID) return 'archive-agent — fatal error';
  if (id.startsWith('legal:')) return `less /site/${id.slice(6)}.txt`;
  if (id.startsWith('show:')) {
    const slug = id.slice(5);
    const post = posts.find((p) => p.slug === slug);
    return `git show ${shortHash(slug)} — ${post?.title ?? slug}`;
  }
  return id;
}
