import type { OpenWin } from './types';

export function TermWindow({
  win,
  active,
  title,
  children,
  onClose,
  onEscape,
  dragProps,
  resizeProps,
  onActivate,
  onKeyDown,
  onTitleDoubleClick,
}: {
  win: OpenWin;
  active: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  onEscape?: () => void;
  dragProps: { onPointerDown: (e: React.PointerEvent) => void };
  resizeProps: { onPointerDown: (e: React.PointerEvent) => void };
  onActivate: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  onTitleDoubleClick?: () => void;
}) {
  const { geom } = win;
  return (
    <div
      className={`retro-terminal-window ${active ? 'retro-terminal-window--active' : ''}`}
      data-retro-window-id={win.id}
      style={{ left: geom.x, top: geom.y, width: geom.w, height: geom.h, zIndex: 100 + win.z }}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          (onEscape ?? onClose)();
          return;
        }
        onKeyDown?.(e);
      }}
      onPointerDown={(e) => {
        e.currentTarget.focus({ preventScroll: true });
        onActivate();
      }}
    >
      <div
        className={`retro-terminal-titlebar ${active ? 'retro-terminal-titlebar--active' : ''}`}
        onDoubleClick={(e) => {
          e.preventDefault();
          onTitleDoubleClick?.();
        }}
        {...dragProps}
      >
        <span className="retro-terminal-dots" aria-hidden="true">
          <span className="retro-terminal-dot" />
          <span className="retro-terminal-dot" />
          <span className="retro-terminal-dot" />
        </span>
        <span className="retro-terminal-title-text">{title}</span>
        <button
          className="retro-terminal-close"
          aria-label="Close"
          onClick={onClose}
          onPointerDown={(e) => e.stopPropagation()}
        >
          ×
        </button>
      </div>
      {children}
      <div className="retro-terminal-resize" {...resizeProps}>◢</div>
    </div>
  );
}
