import Link from 'next/link';
import { useMemo } from 'react';

import type { LaneCell, RowGraph } from '@/utils/graph';
import type { PostFrontMatter } from '@/utils/mdx';

/**
 * Sentinel used in the highlight set to mark the main rail. Branch
 * names are arbitrary strings in `BRANCH_TAGS`, so we just need a
 * value that can never collide with a real branch tag.
 */
export const MAIN_LANE = '__main__';

type Props = Pick<
  PostFrontMatter,
  'title' | 'summary' | 'slug' | 'publishedAt' | 'readingTime' | 'tags'
> & {
  /**
   * Drawing directives for the rail at this row. When omitted the
   * card renders a plain main-only rail. Posts that carry a branch
   * tag get one or more side lanes via this prop.
   */
  graph?: RowGraph;
  /** True for the visually topmost post on page 1 (most recent). */
  isHead?: boolean;
  /**
   * Names of the branch tags rendered as side lanes on the visible
   * page, aligned positionally with `graph.lanes`. Used to map a lane
   * index to the branch name for hover-highlight purposes.
   */
  activeBranches?: readonly string[];
  /**
   * Names of lanes currently highlighted (because some article on the
   * page is being hovered). Includes branch names and/or `MAIN_LANE`.
   * When a segment's lane is in this set, it renders in the emphasis
   * color regardless of whether it's owned by *this* row.
   */
  highlightedLanes?: ReadonlySet<string> | null;
  /**
   * Called when the cursor enters or leaves this card. The argument is
   * the set of lanes owned by this card (branch names and/or
   * `MAIN_LANE`) on enter, or `null` on leave. The parent lifts this
   * into shared state so siblings can react.
   */
  onHighlight?: (lanes: ReadonlySet<string> | null) => void;
};

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

/**
 * Geometry for the graph rail. The rail's width grows with the number
 * of active branch lanes. Coordinates are in the rail SVG's local
 * units; vertical-aspect distortion is allowed (arcs stretch with
 * row height) while strokes stay 1px via `vector-effect`.
 */
const MAIN_X = 12;
const LANE_GAP = 16;
const NODE_R = 4;
const TOP_HEIGHT = 40; // px, height of the top-arc zone (node sits at its bottom)

const laneX = (laneIdx: number) => MAIN_X + LANE_GAP * (laneIdx + 1);
const railWidth = (laneCount: number) => MAIN_X + LANE_GAP * (laneCount + 1);

const DEFAULT_GRAPH: RowGraph = {
  mainTopLine: false,
  mainBottomLine: false,
  mainOrb: true,
  lanes: [],
};

/**
 * A lane is "owned" by a row when that row's post is part of the branch
 * (it has an orb, sprout, or merge on the lane). Owned lanes determine
 * which lanes get highlighted when the card is hovered.
 */
const isLaneOwned = (cell: LaneCell) =>
  cell.laneOrb || cell.topSprout || cell.topMerge;

/**
 * Tailwind class that swells the stroke from the neutral rail color
 * to the same emphasis used for orbs. Applied to every segment of a
 * highlighted lane on the page, so the entire branch thread lights up
 * (not just the hovered row's slice).
 */
const HIGHLIGHT_STROKE =
  'text-gray-900 dark:text-gray-100 transition-colors duration-200';

export default function BlogPostCard({
  title,
  summary,
  slug,
  publishedAt,
  readingTime,
  tags,
  graph = DEFAULT_GRAPH,
  isHead = false,
  activeBranches,
  highlightedLanes,
  onHighlight,
}: Props) {
  const formattedDate = dateFormatter.format(new Date(publishedAt));
  const { mainTopLine, mainBottomLine, mainOrb, lanes } = graph;
  const width = railWidth(lanes.length);

  // Names of lanes this row owns (i.e. the post is on these branches,
  // or sits on main). Computed once per render and reported up to the
  // parent on mouse enter so siblings can highlight matching segments.
  const ownedLanes = useMemo(() => {
    const set = new Set<string>();
    if (mainOrb) set.add(MAIN_LANE);
    if (activeBranches) {
      for (const [idx, cell] of lanes.entries()) {
        if (isLaneOwned(cell)) {
          const name = activeBranches[idx];
          if (name) set.add(name);
        }
      }
    }
    return set;
  }, [mainOrb, lanes, activeBranches]);

  const isHighlighted = (lane: string) => highlightedLanes?.has(lane) ?? false;
  const isMainHighlighted = isHighlighted(MAIN_LANE);
  const laneHighlighted = (idx: number) => {
    const name = activeBranches?.[idx];
    return name ? isHighlighted(name) : false;
  };

  return (
    <article
      className="group relative flex gap-x-5 sm:gap-x-6"
      onMouseEnter={() => onHighlight?.(ownedLanes)}
      onMouseLeave={() => onHighlight?.(null)}
    >
      {/* Graph rail */}
      <div
        className="relative flex-shrink-0"
        style={{ width: `${width}px` }}
        aria-hidden="true"
      >
        {/* Top-arc zone: fixed height. Holds the upper half of the
            main lane, lane lines for branches passing above this row,
            and any branch-creation sprout arcs. */}
        <svg
          width={width}
          height={TOP_HEIGHT}
          viewBox={`0 0 ${width} ${TOP_HEIGHT}`}
          className="block text-gray-300 dark:text-gray-700"
        >
          {mainTopLine && (
            <line
              x1={MAIN_X}
              y1={0}
              x2={MAIN_X}
              y2={TOP_HEIGHT}
              stroke="currentColor"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
              className={isMainHighlighted ? HIGHLIGHT_STROKE : undefined}
            />
          )}
          {lanes.map((cell: LaneCell, idx) => {
            if (!cell.topLine) return null;
            return (
              <line
                key={`top-line-${idx}`}
                x1={laneX(idx)}
                y1={0}
                x2={laneX(idx)}
                y2={TOP_HEIGHT}
                stroke="currentColor"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
                className={
                  laneHighlighted(idx) ? HIGHLIGHT_STROKE : undefined
                }
              />
            );
          })}
          {lanes.map((cell, idx) => {
            if (!cell.topSprout) return null;
            const lx = laneX(idx);
            const midY = TOP_HEIGHT / 2;
            return (
              <path
                key={`top-sprout-${idx}`}
                d={`M ${MAIN_X} ${TOP_HEIGHT} C ${MAIN_X} ${midY}, ${lx} ${midY}, ${lx} 0`}
                stroke="currentColor"
                strokeWidth={1}
                fill="none"
                vectorEffect="non-scaling-stroke"
                className={
                  laneHighlighted(idx) ? HIGHLIGHT_STROKE : undefined
                }
              />
            );
          })}
          {/* Merge arcs: at each branch's tip post (newest in the
              full archive), curve from the lane back into main.
              Visually the branch closes as a complete thread above
              the tip row. The arc starts at the lane's x at the row's
              node-Y (TOP_HEIGHT) and exits the top of the row at
              main's x. */}
          {lanes.map((cell, idx) => {
            if (!cell.topMerge) return null;
            const lx = laneX(idx);
            const midY = TOP_HEIGHT / 2;
            return (
              <path
                key={`top-merge-${idx}`}
                d={`M ${lx} ${TOP_HEIGHT} C ${lx} ${midY}, ${MAIN_X} ${midY}, ${MAIN_X} 0`}
                stroke="currentColor"
                strokeWidth={1}
                fill="none"
                vectorEffect="non-scaling-stroke"
                className={
                  laneHighlighted(idx) ? HIGHLIGHT_STROKE : undefined
                }
              />
            );
          })}
        </svg>

        {/* Node row: orbs for main and any side lanes that have one
            on this row, plus through-lines that bridge the top-arc and
            bottom-arc zones. The through-lines fill the gap between
            the two zones (the SVGs meet at y=TOP_HEIGHT but the node
            row covers the meeting point) so the rail reads as one
            continuous thread regardless of whether the lane has an
            orb here. Orbs render on top of the lines and visually
            cover them. `z-10` keeps the whole row above the bottom-
            zone wrapper (which paints later in DOM order and would
            otherwise cover the orbs). */}
        <div
          className="absolute left-0 right-0 z-10 text-gray-300 dark:text-gray-700"
          style={{ top: `${TOP_HEIGHT - NODE_R}px`, height: `${NODE_R * 2}px` }}
        >
          <svg
            width={width}
            height={NODE_R * 2}
            viewBox={`0 0 ${width} ${NODE_R * 2}`}
            className="block"
          >
            {/* Through-line for main: drawn whenever main has any
                line touching this row from either side, or has an orb
                here. Covers all "live" main states. */}
            {(mainTopLine || mainBottomLine || mainOrb) && (
              <line
                x1={MAIN_X}
                y1={0}
                x2={MAIN_X}
                y2={NODE_R * 2}
                stroke="currentColor"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
                className={isMainHighlighted ? HIGHLIGHT_STROKE : undefined}
              />
            )}
            {/* Through-line for each lane: bridges the seam between
                the top-arc and bottom-arc zones at the lane's x. We
                only need it when the lane actually visits this lane's
                column at the node row — i.e. there's a vertical line
                or an orb on the lane at this row, or a merge arc that
                lands at (lx, TOP_HEIGHT). Sprout arcs are skipped on
                purpose: they originate at MAIN's bottom edge and exit
                at the lane's *top* edge, never touching the lane at
                the node row, so a through-line there would dangle. */}
            {lanes.map((cell, idx) => {
              const live =
                cell.topLine ||
                cell.bottomLine ||
                cell.topMerge ||
                cell.laneOrb;
              if (!live) return null;
              return (
                <line
                  key={`node-line-${idx}`}
                  x1={laneX(idx)}
                  y1={0}
                  x2={laneX(idx)}
                  y2={NODE_R * 2}
                  stroke="currentColor"
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                  className={
                    laneHighlighted(idx) ? HIGHLIGHT_STROKE : undefined
                  }
                />
              );
            })}
            {mainOrb && (
              <circle
                cx={MAIN_X}
                cy={NODE_R}
                r={NODE_R - 1}
                className={
                  isMainHighlighted
                    ? 'fill-gray-900 stroke-gray-900 dark:fill-gray-100 dark:stroke-gray-100 transition-colors duration-200'
                    : 'fill-white dark:fill-gray-950 stroke-gray-400 dark:stroke-gray-500 transition-colors duration-200'
                }
                strokeWidth={1.5}
                vectorEffect="non-scaling-stroke"
              />
            )}
            {lanes.map(
              (cell, idx) =>
                cell.laneOrb && (
                  <circle
                    key={`lane-orb-${idx}`}
                    cx={laneX(idx)}
                    cy={NODE_R}
                    r={NODE_R - 1.5}
                    className={
                      laneHighlighted(idx)
                        ? 'fill-gray-900 stroke-gray-900 dark:fill-gray-100 dark:stroke-gray-100 transition-colors duration-200'
                        : 'fill-white dark:fill-gray-950 stroke-gray-400 dark:stroke-gray-500 transition-colors duration-200'
                    }
                    strokeWidth={1.5}
                    vectorEffect="non-scaling-stroke"
                  />
                ),
            )}
          </svg>
        </div>

        {/* Bottom-arc zone: stretches to fill remaining row height.
            Wrapped in a positioned div so the SVG actually inherits
            a stretched height (a bare absolutely-positioned SVG with
            `top`/`bottom` won't grow — its intrinsic size wins). */}
        <div
          className="absolute left-0 right-0 text-gray-300 dark:text-gray-700"
          style={{ top: `${TOP_HEIGHT}px`, bottom: 0 }}
        >
          <svg
            width="100%"
            height="100%"
            className="block"
            viewBox={`0 0 ${width} 100`}
            preserveAspectRatio="none"
          >
            {mainBottomLine && (
              <line
                x1={MAIN_X}
                y1={0}
                x2={MAIN_X}
                y2={100}
                stroke="currentColor"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
                className={isMainHighlighted ? HIGHLIGHT_STROKE : undefined}
              />
            )}
            {lanes.map((cell, idx) => {
              if (!cell.bottomLine) return null;
              return (
                <line
                  key={`bottom-line-${idx}`}
                  x1={laneX(idx)}
                  y1={0}
                  x2={laneX(idx)}
                  y2={100}
                  stroke="currentColor"
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                  className={
                    laneHighlighted(idx) ? HIGHLIGHT_STROKE : undefined
                  }
                />
              );
            })}
          </svg>
        </div>
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 pb-10 sm:pb-12">
        <Link
          href={`/blog/${slug}`}
          className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-sm"
        >
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {title}
            </h3>
            {isHead && (
              <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded px-1.5 py-0.5 leading-none">
                <span aria-hidden="true">HEAD</span>
                <span aria-hidden="true">→</span>
                <span>main</span>
              </span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs text-gray-500 dark:text-gray-400">
            <time dateTime={publishedAt}>{formattedDate}</time>
            <span aria-hidden="true">·</span>
            <span>{readingTime.text}</span>
          </div>
          <p className="mt-4 text-gray-600 dark:text-gray-400 leading-relaxed">
            {summary}
          </p>
        </Link>

        {tags.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2" aria-label="Tags">
            {tags.map((tag) => (
              <li key={tag}>
                <Link
                  href={`/tags/${tag}`}
                  className="inline-block font-mono text-xs text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-800 rounded px-2 py-0.5 hover:text-blue-600 dark:hover:text-blue-400 hover:border-gray-400 dark:hover:border-gray-600 transition-colors"
                >
                  #{tag}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
