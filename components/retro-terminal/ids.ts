import type { LegalWindowVariant } from './types';

export const TERM_ID = 'term';
export const PRS_ID = 'latest-prs';
export const NOT_FOUND_ID = 'not-found';
export const STORAGE_KEY = 'retro-terminal-state:v1';

export const showWinId = (slug: string) => `show:${slug}`;
export const legalWinId = (variant: LegalWindowVariant) => `legal:${variant}`;
