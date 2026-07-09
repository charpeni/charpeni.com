import Link from 'next/link';

import { TermWindow } from './TermWindow';

import type { OpenWin } from './types';

export function NotFoundWindow({
  win,
  active,
  path,
  onClose,
  onActivate,
  dragProps,
  resizeProps,
  onTitleDoubleClick,
  compact,
}: {
  win: OpenWin;
  active: boolean;
  path: string;
  onClose: () => void;
  onActivate: () => void;
  dragProps: { onPointerDown: (event: React.PointerEvent) => void };
  resizeProps: { onPointerDown: (event: React.PointerEvent) => void };
  onTitleDoubleClick: () => void;
  compact: boolean;
}) {
  return (
    <TermWindow
      win={win}
      active={active}
      title="archive-agent — fatal error"
      onClose={onClose}
      dragProps={dragProps}
      resizeProps={resizeProps}
      onActivate={onActivate}
      onTitleDoubleClick={onTitleDoubleClick}
      compact={compact}
    >
      <div className="retro-terminal-legal-window" role="alert">
        <div className="retro-terminal-legal-title">404 / PATH NOT FOUND</div>
        <div className="retro-terminal-legal-content">
          <p className="retro-terminal-not-found-command">
            $ archive-agent resolve {path}
          </p>
          <p>
            <strong>fatal:</strong> pathspec &apos;{path}&apos; did not match any
            file known to the archive.
          </p>
          <p>The object may have moved, or it never existed.</p>
          <Link href="/" className="retro-terminal-not-found-link">
            cd / <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
      <div className="retro-terminal-status">
        <span>process exited with code 404</span>
        <span className="retro-terminal-status-hint">
          esc close · drag ◢ to resize
        </span>
      </div>
    </TermWindow>
  );
}
