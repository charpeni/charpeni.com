import type { MDXRemoteSerializeResult } from 'next-mdx-remote';

export type WinGeom = { x: number; y: number; w: number; h: number };
export type WinState = WinGeom & { id: string; z: number };
export type OpenWin = { id: string; geom: WinGeom; z: number; focused: boolean };

export type MdxState =
  | { status: 'ready'; source: MDXRemoteSerializeResult }
  | { status: 'error' };

export type LatestPr = {
  title: string;
  url: string;
  repo: string;
  number: string;
  publishedAt: string;
};

export type LatestPrsState =
  | { status: 'loading' }
  | { status: 'ready'; prs: LatestPr[] }
  | { status: 'error' };

export type LegalWindowVariant = 'disclaimer' | 'privacy-policy';

export type CopyStatus = 'idle' | 'copying' | 'copied' | 'error';

export type StoredTerminalState = {
  cursor?: number;
  windows?: WinState[];
};
