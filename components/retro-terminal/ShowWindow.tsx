import Image, { type ImageProps } from 'next/image';
import { type CSSProperties } from 'react';

import { MDXRemote } from 'next-mdx-remote';

import { Comments } from '@/components/Comments';
import MDXComponents from '@/components/MDXComponents';
import { shortHash } from '@/utils/graph';
import type { PostFrontMatter } from '@/utils/mdx';

import { useCopyMarkdown } from './clipboard';
import { formatLongDate } from './format';
import { branchOf, isBranch } from './postUtils';
import { TermWindow } from './TermWindow';

import type { MdxState, OpenWin } from './types';

function dimension(value: ImageProps['width']): number | null {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function TerminalImage({ alt, width, height, style, ...props }: ImageProps) {
  const w = dimension(width);
  const h = dimension(height);

  if (!w || !h) {
    return <Image alt={alt} width={width} height={height} style={style} {...props} />;
  }

  const frameStyle: CSSProperties = {
    alignSelf: style?.alignSelf,
    aspectRatio: `${w} / ${h}`,
    width: `min(100%, ${w}px)`,
  };

  return (
    <span className="retro-terminal-image-frame" style={frameStyle}>
      <Image
        alt={alt}
        width={width}
        height={height}
        style={{ ...style, width: '100%', height: 'auto' }}
        {...props}
      />
    </span>
  );
}

const TERMINAL_MDX_COMPONENTS = {
  ...MDXComponents,
  Image: TerminalImage,
};

function ShowBody({
  post,
  mdxState,
  onOpenBlogLink,
}: {
  post: PostFrontMatter;
  mdxState?: MdxState;
  onOpenBlogLink: (slug: string) => boolean;
}) {
  const hash = shortHash(post.slug);
  const branch = branchOf(post);
  const date = formatLongDate(post.publishedAt);
  const otherTags = post.tags.filter((t) => !isBranch(t));

  const onContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const anchor = (e.target as Element | null)?.closest<HTMLAnchorElement>('a[href]');
    if (!anchor) return;

    const url = new URL(anchor.href, globalThis.location.href);
    if (url.origin !== globalThis.location.origin) return;
    const match = /^\/blog\/([^/]+)$/.exec(url.pathname);
    if (!match) return;

    if (onOpenBlogLink(decodeURIComponent(match[1]))) {
      e.preventDefault();
    }
  };

  return (
    <div className="retro-terminal-show-scroll" onClickCapture={onContentClick}>
      <div className="retro-terminal-show-meta">
        commit {hash}
        {'\n'}Author: Nicolas Charpentier &lt;
        <a href="mailto:blog@nicolascharpentier.com">blog@nicolascharpentier.com</a>
        &gt;
        {'\n'}Date:   {date}
        {'\n'}Size:   {post.readingTime.text}
        {branch ? `\nrefs:   refs/heads/${branch}` : ''}
        {otherTags.length > 0 ? `\ntopic:  ${otherTags.join(', ')}` : ''}
      </div>
      <div className="retro-terminal-show-title">{post.title}</div>
      {post.image ? (
        <div className="retro-terminal-banner" aria-hidden="true">
          <Image
            src={post.image}
            alt=""
            aria-hidden="true"
            fill
            priority
            sizes="(max-width: 848px) 100vw, 768px"
            className="retro-terminal-banner-img"
          />
        </div>
      ) : null}
      {mdxState?.status === 'ready' ? (
        <>
          <div className="prose retro-terminal-prose">
            <MDXRemote {...mdxState.source} components={TERMINAL_MDX_COMPONENTS} />
          </div>
          <div className="retro-terminal-comments">
            <div className="retro-terminal-comments-title">comments</div>
            <Comments title={post.title} />
          </div>
        </>
      ) : null}
      {mdxState ? null : (
        <div className="retro-terminal-loading-post" aria-busy="true">
          <div className="retro-terminal-show-meta">loading object from remote archive...</div>
          <div className="retro-terminal-skeleton-line retro-terminal-skeleton-line--wide" />
          <div className="retro-terminal-skeleton-line" />
          <div className="retro-terminal-skeleton-line retro-terminal-skeleton-line--short" />
          <div className="retro-terminal-skeleton-image" />
          <div className="retro-terminal-skeleton-line" />
          <div className="retro-terminal-skeleton-line retro-terminal-skeleton-line--wide" />
        </div>
      )}
      {mdxState?.status === 'error' ? (
        <div className="retro-terminal-show-meta">error: could not load post body</div>
      ) : null}
    </div>
  );
}

export function ShowTermWindow({
  win,
  active,
  post,
  mdxState,
  onClose,
  onActivate,
  dragProps,
  resizeProps,
  onOpenBlogLink,
  onTitleDoubleClick,
}: {
  win: OpenWin;
  active: boolean;
  post: PostFrontMatter;
  mdxState?: MdxState;
  onClose: () => void;
  onActivate: () => void;
  dragProps: { onPointerDown: (e: React.PointerEvent) => void };
  resizeProps: { onPointerDown: (e: React.PointerEvent) => void };
  onOpenBlogLink: (slug: string) => boolean;
  onTitleDoubleClick?: () => void;
}) {
  const { status: copyStatus, copy } = useCopyMarkdown(post.slug);
  const branch = branchOf(post);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'c' || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    e.preventDefault();
    void copy();
  };

  const hint =
    copyStatus === 'copied'
      ? 'copied to clipboard ✓'
      : copyStatus === 'error'
        ? 'copy failed — try again'
        : copyStatus === 'copying'
          ? 'copying…'
          : 'c copy markdown · esc close';

  return (
    <TermWindow
      win={win}
      active={active}
      title={`git show ${shortHash(post.slug)} — ${post.title}`}
      onClose={onClose}
      onEscape={onClose}
      dragProps={dragProps}
      resizeProps={resizeProps}
      onActivate={onActivate}
      onKeyDown={onKeyDown}
      onTitleDoubleClick={onTitleDoubleClick}
    >
      <ShowBody post={post} mdxState={mdxState} onOpenBlogLink={onOpenBlogLink} />
      <div className="retro-terminal-status">
        <span>
          {branch ? (
            <>
              branch <b>refs/heads/{branch}</b>
            </>
          ) : (
            <b>main</b>
          )}
        </span>
        <span className="retro-terminal-status-hint">{hint}</span>
      </div>
    </TermWindow>
  );
}
