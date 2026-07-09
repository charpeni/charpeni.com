import '@/styles/app.css';
import '@/styles/retro.css';
import 'rehype-callouts/theme/obsidian';
import 'react-social-icons/bsky.app';
import 'react-social-icons/github';
import 'react-social-icons/linkedin';
import 'react-social-icons/mailto';
import 'react-social-icons/rss';
import 'react-social-icons/x';

import type { AppProps } from 'next/app';
import dynamic from 'next/dynamic';
import Script from 'next/script';

import { SpeedInsights } from '@vercel/speed-insights/next';
import { ThemeProvider } from 'next-themes';

import { RetroModeProvider, useRetroMode } from '@/components/RetroModeContext';
import type { PostFrontMatter } from '@/utils/mdx';

const RetroTerminal = dynamic(() => import('@/components/RetroTerminal'), {
  ssr: false,
});

type RetroPageProps = {
  retroNotFound?: boolean;
  retroPosts?: PostFrontMatter[];
};

function RetroModeGate({
  Component,
  pageProps,
}: {
  Component: AppProps['Component'];
  pageProps: AppProps['pageProps'];
}) {
  const { isRetro } = useRetroMode();
  const retroProps = pageProps as RetroPageProps;
  const posts = retroProps.retroPosts;

  const showTerminal = isRetro && posts;

  if (showTerminal) {
    return <RetroTerminal posts={posts} showNotFound={retroProps.retroNotFound} />;
  }
  return <Component {...pageProps} />;
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Script
        src="https://api.pirsch.io/pa.js"
        strategy="afterInteractive"
        id="pianjs"
        data-code="Tr41JTaYVYMIseTMTDKggSAsFsM85hnC"
        defer
      />

      <ThemeProvider attribute="class">
        <RetroModeProvider>
          <RetroModeGate Component={Component} pageProps={pageProps} />
        </RetroModeProvider>
        <SpeedInsights />
      </ThemeProvider>
    </>
  );
}
