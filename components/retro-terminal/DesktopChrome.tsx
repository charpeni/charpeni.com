import Image from 'next/image';

import type { LegalWindowVariant } from './types';

export function DesktopProfile({
  onOpenPrs,
  mobileExpanded = false,
  onToggleMobile,
}: {
  onOpenPrs: () => void;
  mobileExpanded?: boolean;
  onToggleMobile?: () => void;
}) {
  return (
    <>
      <button
        type="button"
        className="retro-terminal-profile-toggle"
        aria-expanded={mobileExpanded}
        aria-controls="retro-mobile-profile"
        onClick={onToggleMobile}
      >
        <span className="retro-terminal-profile-toggle-glyph" aria-hidden="true">
          <Image
            src="/static/images/nicolas_charpentier.jpeg"
            alt=""
            width={36}
            height={36}
            sizes="36px"
            className="retro-terminal-profile-icon-img"
          />
        </span>
        <span className="retro-terminal-profile-toggle-copy">
          <strong>Nicolas Charpentier</strong>
          <span>Staff Software Engineer</span>
        </span>
        <span className="retro-terminal-profile-toggle-label">
          {mobileExpanded ? 'Close [-]' : 'About [+]'}
        </span>
      </button>
      <div className="retro-terminal-profile-icon" aria-label="Profile picture for Nicolas Charpentier">
        <div className="retro-terminal-profile-icon-glyph" aria-hidden="true">
          <Image
            src="/static/images/nicolas_charpentier.jpeg"
            alt=""
            width={58}
            height={58}
            sizes="58px"
            className="retro-terminal-profile-icon-img"
          />
        </div>
        <div className="retro-terminal-profile-icon-label">profile.txt</div>
      </div>
      <aside
        id="retro-mobile-profile"
        className={`retro-terminal-profile ${mobileExpanded ? 'retro-terminal-profile--mobile-open' : ''}`}
        aria-label="About Nicolas Charpentier"
      >
        <div className="retro-terminal-profile-name">
          Nicolas Charpentier{' '}
          <a className="retro-terminal-profile-email" href="mailto:blog@nicolascharpentier.com">
            &lt;blog@nicolascharpentier.com&gt;
          </a>
        </div>
        <div className="retro-terminal-profile-role">
          Staff Software Engineer — frontend infrastructure &amp; developer tooling
        </div>
        <div className="retro-terminal-profile-stack">
          TypeScript · React Native · React · GraphQL · CI/CD
        </div>
        <div className="retro-terminal-profile-current">
          Currently @{' '}
          <a href="https://shortcut.com" target="_blank" rel="noopener noreferrer">Shortcut</a>
          {' — '}
          <a href="https://korey.ai" target="_blank" rel="noopener noreferrer">Korey.ai</a>
          {' · open source enthusiast'}
        </div>
        <div className="retro-terminal-profile-links">
          <a href="https://github.com/charpeni" target="_blank" rel="noopener noreferrer">github.com/charpeni</a>
          {' · '}
          <a href="https://www.linkedin.com/in/nicolas-charpentier-8a2b8a104/" target="_blank" rel="noopener noreferrer">linkedin.com/in/nicolas-charpentier-8a2b8a104</a>
          {' · '}
          <a href="https://x.com/charpeni_" target="_blank" rel="noopener noreferrer">x.com/charpeni_</a>
          {' · '}
          <a href="https://bsky.app/profile/charpeni.bsky.social" target="_blank" rel="noopener noreferrer">bsky.app/charpeni.bsky.social</a>
          {' · '}
          <a href="/blog/rss.xml" target="_blank" rel="noopener noreferrer">rss</a>
          {' · '}
          <a
            href="https://prs.charpeni.com"
            onClick={(e) => {
              e.preventDefault();
              onOpenPrs();
            }}
          >latest PRs</a>
        </div>
      </aside>
    </>
  );
}

export function DesktopFooter({ onOpenLegal }: { onOpenLegal: (variant: LegalWindowVariant) => void }) {
  return (
    <footer className="retro-terminal-footer">
      <div className="retro-terminal-footer-links">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onOpenLegal('disclaimer');
          }}
        >Disclaimer</button>
        <span aria-hidden="true">|</span>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onOpenLegal('privacy-policy');
          }}
        >Privacy Policy</button>
        <span aria-hidden="true">|</span>
        <a href="/blog/rss.xml" target="_blank" rel="noopener noreferrer">RSS Feed</a>
      </div>
      <div>© 2021-present Nicolas Charpentier. All Rights Reserved.</div>
    </footer>
  );
}
