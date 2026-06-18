import { isBranchTag } from '@/utils/graph';

export const BRANCH_COLORS: Record<string, string> = {
  graphql: '#3b8a9e',
  homelab: '#7c5e9e',
  react: '#9a4f00',
  testing: '#3b6db8',
  tooling: '#a8443a',
  typescript: '#4a7c3a',
};

export const isBranch = (tag: string) => isBranchTag(tag);
export const branchOf = (post: { tags: string[] }) => post.tags.find((t) => isBranch(t));
