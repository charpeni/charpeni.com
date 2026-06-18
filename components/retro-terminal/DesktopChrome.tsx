import Image from 'next/image';

import type { LegalWindowVariant } from './types';

export function DesktopProfile({ onOpenPrs }: { onOpenPrs: () => void }) {
  return (
    <>
      <div className="retro-terminal-profile-icon" aria-label="Selected desktop item: profile.txt" aria-selected="true">
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
      <aside className="retro-terminal-profile" aria-label="About Nicolas Charpentier">
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
