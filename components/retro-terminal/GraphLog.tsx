import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { BRANCH_TAGS, computeGraph, shortHash } from '@/utils/graph';
import type { BranchTag, RowGraph } from '@/utils/graph';
import type { PostFrontMatter } from '@/utils/mdx';

import { formatIsoDate } from './format';
import { GRAPH_LANE_GAP, GRAPH_MAIN_X, GRAPH_ROW_H, graphWidth } from './geometry';
import { AGENT_INTRO_SEEN_KEY } from './ids';
import { BRANCH_COLORS, branchOf } from './postUtils';

function hasSeenAgentIntro(): boolean {
  try {
    return globalThis.localStorage?.getItem(AGENT_INTRO_SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

function markAgentIntroSeen() {
  try {
    globalThis.localStorage?.setItem(AGENT_INTRO_SEEN_KEY, '1');
  } catch {
    return;
  }
}

function prefersReducedMotion(): boolean {
  return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

function GraphRail({
  row,
  activeBranches,
}: {
  row: RowGraph;
  activeBranches: BranchTag[];
}) {
  const height = GRAPH_ROW_H;
  const mid = height / 2;
  const mainColor = '#7a7160';
  const width = graphWidth(activeBranches.length);
  const laneX = (i: number) => GRAPH_MAIN_X + GRAPH_LANE_GAP * (i + 1);

  return (
    <svg
      className="retro-terminal-graph"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      focusable="false"
    >
      {row.mainTopLine ? (
        <line className="retro-terminal-graph-line" x1={GRAPH_MAIN_X} y1={0} x2={GRAPH_MAIN_X} y2={mid} stroke={mainColor} />
      ) : null}
      {row.mainBottomLine ? (
        <line className="retro-terminal-graph-line" x1={GRAPH_MAIN_X} y1={mid} x2={GRAPH_MAIN_X} y2={height} stroke={mainColor} />
      ) : null}
      {row.mainOrb ? (
        <circle className="retro-terminal-graph-orb retro-terminal-graph-orb--main" cx={GRAPH_MAIN_X} cy={mid} r={4} />
      ) : null}
      {activeBranches.map((branch, i) => {
        const cell = row.lanes[i];
        const x = laneX(i);
        const color = BRANCH_COLORS[branch] ?? '#b45309';
        return (
          <g key={branch}>
            {cell.topLine ? (
              <line className="retro-terminal-graph-line" x1={x} y1={0} x2={x} y2={mid} stroke={color} />
            ) : null}
            {cell.bottomLine ? (
              <line className="retro-terminal-graph-line" x1={x} y1={mid} x2={x} y2={height} stroke={color} />
            ) : null}
            {cell.topSprout ? (
              <path
                className="retro-terminal-graph-line"
                d={`M ${GRAPH_MAIN_X} ${mid} C ${GRAPH_MAIN_X + 6} ${mid - 1}, ${x - 8} 1, ${x} 0`}
                stroke={color}
              />
            ) : null}
            {cell.topMerge ? (
              <path
                className="retro-terminal-graph-line"
                d={`M ${x} ${mid} C ${x - 8} ${mid - 1}, ${GRAPH_MAIN_X + 6} 1, ${GRAPH_MAIN_X} 0`}
                stroke={color}
              />
            ) : null}
            {cell.laneOrb ? (
              <circle className="retro-terminal-graph-orb" cx={x} cy={mid} r={4} fill={color} />
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

export function GraphLog({
  posts,
  cursor,
  onSelect,
  onOpen,
  isMobile,
  contentRef,
}: {
  posts: PostFrontMatter[];
  cursor: number;
  onSelect: (i: number) => void;
  onOpen: (i: number) => void;
  isMobile: boolean;
  contentRef: React.RefObject<HTMLDivElement | null>;
}) {
  const graph = useMemo(() => computeGraph(posts, posts), [posts]);
  const { activeBranches, rows } = graph;
  const rowRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [shouldPlayIntro] = useState(() => !isMobile && !hasSeenAgentIntro() && !prefersReducedMotion());
  const [agentPhase, setAgentPhase] = useState<'thinking' | 'indexing' | 'tool' | 'done'>(shouldPlayIntro ? 'thinking' : 'done');
  const visibleAgentPhase = isMobile ? 'done' : agentPhase;
  const introTimersRef = useRef<ReturnType<typeof globalThis.setTimeout>[]>([]);

  const clearIntroTimers = useCallback(() => {
    for (const timer of introTimersRef.current) globalThis.clearTimeout(timer);
    introTimersRef.current = [];
  }, []);

  const completeIntro = useCallback(() => {
    clearIntroTimers();
    markAgentIntroSeen();
    setAgentPhase('done');
  }, [clearIntroTimers]);

  useEffect(() => {
    const el = rowRefs.current[cursor];
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  useEffect(() => {
    if (!shouldPlayIntro) return;

    introTimersRef.current = [
      globalThis.setTimeout(() => setAgentPhase('indexing'), 900),
      globalThis.setTimeout(() => setAgentPhase('tool'), 2100),
      globalThis.setTimeout(completeIntro, 3800),
    ];
    return clearIntroTimers;
  }, [shouldPlayIntro, completeIntro, clearIntroTimers]);

  useEffect(() => {
    if (visibleAgentPhase === 'done') return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Meta' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Shift') return;
      const target = e.target;
      if (e.key === 'Enter' && target instanceof Element && target.closest('[data-retro-window-id="term"]')) {
        e.stopPropagation();
      }
      completeIntro();
    };
    globalThis.addEventListener('keydown', onKeyDown, true);
    return () => globalThis.removeEventListener('keydown', onKeyDown, true);
  }, [visibleAgentPhase, completeIntro]);

  return (
    <>
      <div
        className="retro-terminal-agent"
        onClick={visibleAgentPhase === 'done' ? undefined : completeIntro}
      >
        <div className="retro-terminal-agent-user">
          <span className="retro-terminal-agent-mark">›</span>
          <span>List charpeni.com blog posts</span>
        </div>
        <div className="retro-terminal-agent-step">
          <span className="retro-terminal-agent-orb" aria-hidden="true" />
          <span>
            {visibleAgentPhase === 'thinking'
              ? 'Reading archive intent and route context'
              : visibleAgentPhase === 'indexing'
                ? 'Indexing posts, dates, and branch tags'
                : 'Archive mapped to commit log'}
          </span>
          {visibleAgentPhase === 'thinking' || visibleAgentPhase === 'indexing' ? <span className="retro-terminal-agent-dots" aria-hidden="true" /> : null}
        </div>
        <div className={`retro-terminal-agent-tool ${visibleAgentPhase === 'thinking' || visibleAgentPhase === 'indexing' ? 'retro-terminal-agent-tool--pending' : ''}`}>
          <div className="retro-terminal-agent-tool-name">tool: archive.list_posts --format=git-log</div>
          <div className="retro-terminal-prompt-cmd">
            {visibleAgentPhase === 'thinking' || visibleAgentPhase === 'indexing' ? 'queued' : '$ git log --graph --oneline --all --date=short'}
            {visibleAgentPhase === 'tool' ? <span className="retro-terminal-agent-dots" aria-hidden="true" /> : null}
          </div>
        </div>
      </div>
      {visibleAgentPhase === 'done' ? (
        <>
          <div className="retro-terminal-prompt-meta">
            connected to charpeni.com · {posts.length} commits · {BRANCH_TAGS.length} branches · HEAD at{' '}
            {posts[0] ? shortHash(posts[0].slug) : '—'}
          </div>
          <div
            ref={contentRef}
            className="retro-terminal-content"
            tabIndex={0}
          >
            <div className="retro-terminal-log">
              {posts.map((post, i) => {
                const row = rows[i];
                const hash = shortHash(post.slug);
                const branch = branchOf(post);
                const isSel = i === cursor;
                return (
                  <button
                    type="button"
                    key={post.slug}
                    ref={(el) => {
                      rowRefs.current[i] = el;
                    }}
                    className={`retro-terminal-row ${isSel ? 'retro-terminal-row--selected' : ''}`}
                    aria-current={isSel ? 'true' : undefined}
                    onClick={() => (isMobile ? onOpen(i) : onSelect(i))}
                    onDoubleClick={() => onOpen(i)}
                  >
                    {isMobile ? null : <GraphRail row={row} activeBranches={activeBranches} />}
                    <span className="retro-terminal-hash">{hash}</span>
                    <span className="retro-terminal-date">{formatIsoDate(post.publishedAt)}</span>
                    {branch ? (
                      <span
                        className="retro-terminal-refs"
                        style={{ color: BRANCH_COLORS[branch] ?? '#b45309' }}
                      >
                        ({branch})
                      </span>
                    ) : null}
                    <span className="retro-terminal-msg">{post.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <div
          className="retro-terminal-content retro-terminal-content--loading"
          ref={contentRef}
          tabIndex={0}
          onClick={completeIntro}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') e.preventDefault();
            completeIntro();
          }}
          role="button"
          aria-label="Skip intro"
        >
          <span className="retro-terminal-loading-line">
            {visibleAgentPhase === 'thinking'
              ? 'Planning archive query'
              : visibleAgentPhase === 'indexing'
                ? 'Preparing graph lanes'
                : 'Running archive.list_posts'}
            <span className="retro-terminal-agent-dots" aria-hidden="true" />
          </span>
          <span className="retro-terminal-loading-skip" aria-hidden="true">click or press any key to skip</span>
        </div>
      )}
    </>
  );
}
