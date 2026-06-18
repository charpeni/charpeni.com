import { useEffect, useState } from 'react';

import { formatYearMonth } from './format';
import { TermWindow } from './TermWindow';

import type { LatestPr, LatestPrsState, OpenWin } from './types';

export function LatestPrsWindow({
  win,
  active,
  onClose,
  onActivate,
  dragProps,
  resizeProps,
  onTitleDoubleClick,
}: {
  win: OpenWin;
  active: boolean;
  onClose: () => void;
  onActivate: () => void;
  dragProps: { onPointerDown: (e: React.PointerEvent) => void };
  resizeProps: { onPointerDown: (e: React.PointerEvent) => void };
  onTitleDoubleClick?: () => void;
}) {
  const [state, setState] = useState<LatestPrsState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    void fetch('/api/latestPrs')
      .then((response) => {
        if (!response.ok) throw new Error('Failed to load latest PRs');
        return response.json() as Promise<{ prs: LatestPr[] }>;
      })
      .then(({ prs }) => {
        if (!cancelled) setState({ status: 'ready', prs });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <TermWindow
      win={win}
      active={active}
      title="open https://prs.charpeni.com"
      onClose={onClose}
      onEscape={onClose}
      dragProps={dragProps}
      resizeProps={resizeProps}
      onActivate={onActivate}
      onTitleDoubleClick={onTitleDoubleClick}
    >
      <div className="retro-terminal-prs-window">
        <div className="retro-terminal-prs-toolbar">
          <span>latest open source contributions</span>
          <a href="https://prs.charpeni.com" target="_blank" rel="noopener noreferrer">
            Open latest PRs ↗
          </a>
        </div>
        <div className="retro-terminal-prs-list">
          {state.status === 'loading' ? (
            <div className="retro-terminal-prs-message">Fetching recent pull requests...</div>
          ) : null}
          {state.status === 'error' ? (
            <div className="retro-terminal-prs-message">
              Could not load the feed. Use the external link above.
            </div>
          ) : null}
          {state.status === 'ready' ? state.prs.map((pr) => (
            <a
              key={pr.url}
              className="retro-terminal-prs-row"
              href={pr.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="retro-terminal-prs-number">{pr.number}</span>
              <span className="retro-terminal-prs-copy">
                <span className="retro-terminal-prs-title">{pr.title}</span>
                <span className="retro-terminal-prs-repo">{pr.repo} · {formatYearMonth(pr.publishedAt)}</span>
              </span>
            </a>
          )) : null}
        </div>
      </div>
    </TermWindow>
  );
}
