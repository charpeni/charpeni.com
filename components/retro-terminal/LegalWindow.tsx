import { LegalContent, LEGAL_TITLES } from '@/components/LegalContent';

import { TermWindow } from './TermWindow';

import type { LegalWindowVariant, OpenWin } from './types';

export function LegalWindow({
  win,
  active,
  variant,
  onOpenLegal,
  onClose,
  onActivate,
  dragProps,
  resizeProps,
  onTitleDoubleClick,
  compact,
}: {
  win: OpenWin;
  active: boolean;
  variant: LegalWindowVariant;
  onOpenLegal: (variant: LegalWindowVariant) => void;
  onClose: () => void;
  onActivate: () => void;
  dragProps: { onPointerDown: (e: React.PointerEvent) => void };
  resizeProps: { onPointerDown: (e: React.PointerEvent) => void };
  onTitleDoubleClick?: () => void;
  compact?: boolean;
}) {
  const onContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const anchor = (e.target as Element | null)?.closest<HTMLAnchorElement>('a[href]');
    if (!anchor) return;

    const url = new URL(anchor.href, globalThis.location.href);
    if (url.origin !== globalThis.location.origin) return;
    if (url.pathname === '/disclaimer') {
      e.preventDefault();
      onOpenLegal('disclaimer');
    }
    if (url.pathname === '/privacy-policy') {
      e.preventDefault();
      onOpenLegal('privacy-policy');
    }
  };

  return (
    <TermWindow
      win={win}
      active={active}
      title={`less /site/${variant}.txt`}
      onClose={onClose}
      onEscape={onClose}
      dragProps={dragProps}
      resizeProps={resizeProps}
      onActivate={onActivate}
      onTitleDoubleClick={onTitleDoubleClick}
      compact={compact}
    >
      <div className="retro-terminal-legal-window" onClickCapture={onContentClick}>
        <div className="retro-terminal-legal-title">{LEGAL_TITLES[variant]}</div>
        <div className="retro-terminal-legal-content">
          <LegalContent variant={variant} />
        </div>
      </div>
      <div className="retro-terminal-status">
        <span><b>{variant}</b></span>
        <span className="retro-terminal-status-hint">esc close · drag ◢ to resize</span>
      </div>
    </TermWindow>
  );
}
