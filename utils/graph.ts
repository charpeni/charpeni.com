/**
 * Computes git-graph branch-lane state for the visible (paginated) page
 * of posts.
 *
 * A small whitelist of "branch tags" represents continuous threads of
 * work in the archive (e.g. `testing`, `dependencies`). Posts carrying
 * a branch tag sit on that branch's side lane, mirroring how `git log
 * --graph` draws topic-branch commits. The branch sprouts from main at
 * its oldest post (the "branch-creation commit") and merges back into
 * main at its newest post (the "merge commit"), giving every branch
 * the visual feel of a deliberate, finite thread.
 *
 * A post can sit on multiple branches simultaneously (one orb per lane,
 * no main orb). Topic tags that aren't in the whitelist render as plain
 * `#chip`s only — they don't influence the graph.
 *
 * Pagination rule: a branch only renders as a lane on a page if at
 * least one of its posts is visible there. When the branch extends to
 * other pages, the lane line exits the top/bottom edge of the page.
 *
 * Output is a per-row directive struct (`RowGraph`) describing what to
 * draw in the top half, bottom half, and node row for each lane. The
 * renderer is a dumb consumer.
 */

/**
 * The whitelist of tags that render as branches in the graph. Order
 * matters only for legend display; lane assignment per page is
 * dynamic so unused branches don't reserve visual space.
 */
export const BRANCH_TAGS = [
  'graphql',
  'homelab',
  'react',
  'testing',
  'tooling',
  'typescript',
] as const;

export type BranchTag = (typeof BRANCH_TAGS)[number];

const BRANCH_TAG_SET: ReadonlySet<string> = new Set(BRANCH_TAGS);

export function isBranchTag(tag: string): tag is BranchTag {
  return BRANCH_TAG_SET.has(tag);
}

type PostLike = {
  slug: string;
  tags: string[];
};

/**
 * Drawing directives for one (lane × row) cell.
 */
export type LaneCell = {
  /** Lane line in the top half of the row. */
  topLine: boolean;
  /** Lane line in the bottom half of the row. */
  bottomLine: boolean;
  /**
   * Sprout arc in the top half, curving from main's orb up-and-right
   * to the lane. Drawn at the branch-creation row (oldest post on
   * the branch in the full archive) — the branch is "born" here.
   * Replaces the vertical lane line in the top half.
   */
  topSprout: boolean;
  /**
   * Merge arc in the top half, curving from the lane up-and-left to
   * main. Drawn at the branch-tip row (newest post on the branch in
   * the full archive) — the branch reintegrates into main here.
   * Replaces the vertical lane line in the top half.
   */
  topMerge: boolean;
  /** Orb on the side lane for this row. */
  laneOrb: boolean;
};

export type RowGraph = {
  /** Whether the main rail draws a line in the top half of this row. */
  mainTopLine: boolean;
  /** Whether the main rail draws a line in the bottom half of this row. */
  mainBottomLine: boolean;
  /**
   * Whether the row gets a main-rail orb. False when the post sits on
   * one or more side lanes (its orb(s) are on the lane(s) instead).
   */
  mainOrb: boolean;
  /** Per-lane cells, aligned with `GraphResult.activeBranches`. */
  lanes: LaneCell[];
};

export type GraphResult = {
  /**
   * Branch tags that have at least one post on the visible page,
   * rendered as side lanes left-to-right in this order.
   */
  activeBranches: BranchTag[];
  /** Per-visible-row graph directives, aligned with the input. */
  rows: RowGraph[];
};

const empty = (): LaneCell => ({
  topLine: false,
  bottomLine: false,
  topSprout: false,
  topMerge: false,
  laneOrb: false,
});

/**
 * @param visiblePosts    Posts on the current page, newest-first.
 * @param allPosts        The full archive (newest-first), used to
 *                        determine where each branch begins/ends
 *                        beyond the visible window.
 */
export function computeGraph(
  visiblePosts: PostLike[],
  allPosts: PostLike[],
): GraphResult {
  // Index posts in each branch from the full archive (newest-first).
  // The first entry is the branch's tip (newest post → merge point);
  // the last entry is the creation point (oldest post → sprout point).
  const branchAllPosts = new Map<BranchTag, PostLike[]>();
  for (const tag of BRANCH_TAGS) branchAllPosts.set(tag, []);
  for (const post of allPosts) {
    for (const tag of post.tags) {
      if (isBranchTag(tag)) branchAllPosts.get(tag)!.push(post);
    }
  }
  // Drop branches with fewer than 2 posts in the full archive — a
  // single-post "branch" isn't a thread.
  for (const [tag, posts] of branchAllPosts) {
    if (posts.length < 2) branchAllPosts.delete(tag);
  }

  // Determine which branches have any post on the visible page.
  const visibleSlugs = new Set(visiblePosts.map((p) => p.slug));
  const activeBranches: BranchTag[] = [];
  for (const [tag, posts] of branchAllPosts) {
    if (posts.some((p) => visibleSlugs.has(p.slug))) {
      activeBranches.push(tag);
    }
  }
  // Stable, deterministic lane order (alphabetical via BRANCH_TAGS sort).
  activeBranches.sort();

  // Per-branch, per-page metadata used to drive row directives.
  const branchInfo = new Map<
    BranchTag,
    {
      /** Visible row indices (sorted ascending) that belong to this branch. */
      visibleRows: number[];
      /** True if any branch post lives on a *newer* (earlier) page. */
      extendsAbove: boolean;
      /** True if any branch post lives on an *older* (later) page. */
      extendsBelow: boolean;
      /** Slug of the branch's creation post (absolute oldest in the full branch). */
      creationSlug: string;
      /** Slug of the branch's tip / merge post (absolute newest in the full branch). */
      tipSlug: string;
    }
  >();

  for (const tag of activeBranches) {
    const all = branchAllPosts.get(tag)!;
    const visibleRows: number[] = [];
    for (const [idx, post] of visiblePosts.entries()) {
      if (post.tags.includes(tag)) visibleRows.push(idx);
    }
    const visibleSlugSet = new Set(
      visibleRows.map((idx) => visiblePosts[idx].slug),
    );
    // `all` is newest-first.
    //   - first visible idx > 0  →  newer (off-page) sibling exists.
    //   - last visible idx  < all.length-1  →  older (off-page) sibling.
    const firstVisibleIdxInAll = all.findIndex((p) =>
      visibleSlugSet.has(p.slug),
    );
    const lastVisibleIdxInAll = all.findLastIndex((p) =>
      visibleSlugSet.has(p.slug),
    );

    branchInfo.set(tag, {
      visibleRows,
      extendsAbove: firstVisibleIdxInAll > 0,
      extendsBelow: lastVisibleIdxInAll < all.length - 1,
      creationSlug: all.at(-1)!.slug,
      tipSlug: all[0].slug,
    });
  }

  // Page-level main-rail teasers across pagination edges.
  const hasNewerPage = visiblePosts[0]?.slug !== allPosts[0]?.slug;
  const hasOlderPage = visiblePosts.at(-1)?.slug !== allPosts.at(-1)?.slug;
  // Main is the eternal trunk going forward in time: at the very top
  // of the archive (HEAD on page 1 row 0) we still tease continuity
  // upward off the page, so any merge arc landing into main reads
  // correctly (the branch closes *into* a visible trunk) and the
  // "main continues" mental model holds. The oldest end is left
  // clean — the last commit on the last page is the repo's origin.
  const isHead = !hasNewerPage;

  const rows: RowGraph[] = visiblePosts.map((post, idx) => {
    const lanes: LaneCell[] = activeBranches.map((tag) => {
      const info = branchInfo.get(tag)!;
      const cell = empty();

      const top = info.visibleRows[0];
      const bottom = info.visibleRows.at(-1)!;
      const isInBranch = post.tags.includes(tag);
      const isCreation = isInBranch && post.slug === info.creationSlug;
      const isTip = isInBranch && post.slug === info.tipSlug;

      // Vertical lane lines: drawn through a row's half iff the lane
      // is "live" at that point — either continuing toward another
      // visible branch post in that direction or extending off-page
      // to tease continuity to a neighbouring page.
      //
      // The lane is "in range" on this row iff it's vertically
      // bounded by either an in-page anchor (top/bottom orb) or by
      // an off-page extension. Within that range:
      //   - top half is live unless the row is the topmost orb on
      //     page AND the lane doesn't extend above (nothing to draw
      //     up to);
      //   - bottom half is symmetric.
      const inRange =
        (info.extendsAbove || idx >= top) && (info.extendsBelow || idx <= bottom);
      cell.topLine = inRange && (info.extendsAbove || idx > top);
      cell.bottomLine = inRange && (info.extendsBelow || idx < bottom);

      // Branch-creation sprout: at the creation post (the visual
      // *bottom* of the visible portion of the branch — oldest in the
      // archive), curve from main up to the lane. The arc replaces
      // the vertical lane line in the top half. Triggered when there
      // is any branch post above (visible or off-page) for the arc
      // to lead toward.
      if (isCreation && (idx > top || info.extendsAbove)) {
        cell.topSprout = true;
        cell.topLine = false;
      }

      // Merge arc: at the tip post (the visual *top* of the visible
      // portion of the branch — newest in the archive), curve from
      // the lane back into main. The arc replaces the vertical lane
      // line in the top half. Triggered when there is any branch
      // post below (visible or off-page) for the merge to gather.
      if (isTip && (idx < bottom || info.extendsBelow)) {
        cell.topMerge = true;
        cell.topLine = false;
      }

      // Orb on the lane: branch posts that aren't the creation point
      // sit on the lane. The creation post sits on main (its main
      // orb is the branch-creation commit drawn by the sprout arc).
      cell.laneOrb = isInBranch && !isCreation;

      return cell;
    });

    // The post's main orb is suppressed when it sits on at least one
    // side lane. A post is on a side lane iff it carries any branch
    // tag *and* isn't the creation point of every branch it carries
    // (the creation post sits on main).
    let onAnyLane = false;
    for (const tag of activeBranches) {
      if (!post.tags.includes(tag)) continue;
      const info = branchInfo.get(tag)!;
      if (post.slug !== info.creationSlug) {
        onAnyLane = true;
        break;
      }
    }

    return {
      mainTopLine: idx > 0 || hasNewerPage || (isHead && idx === 0),
      mainBottomLine: idx < visiblePosts.length - 1 || hasOlderPage,
      mainOrb: !onAnyLane,
      lanes,
    };
  });

  return { activeBranches, rows };
}
