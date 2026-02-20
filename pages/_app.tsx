import '@/styles/app.css';
import 'rehype-callouts/theme/obsidian';
import 'react-social-icons/bsky.app';
import 'react-social-icons/github';
import 'react-social-icons/linkedin';
import 'react-social-icons/mailto';
import 'react-social-icons/rss';
import 'react-social-icons/x';

import type { AppProps } from 'next/app';
import Script from 'next/script';

import { SpeedInsights } from '@vercel/speed-insights/next';
import { ThemeProvider } from 'next-themes';

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
        <Component {...pageProps} />
        <SpeedInsights />
      </ThemeProvider>
    </>
  );
}
