import '@/styles/app.css';
import 'rehype-callouts/theme/obsidian';
import 'react-social-icons/bsky.app';
import 'react-social-icons/github';
import 'react-social-icons/linkedin';
import 'react-social-icons/mailto';
import 'react-social-icons/x';

import type { AppProps } from 'next/app';
import Script from 'next/script';

import { ThemeProvider } from 'next-themes';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Script
        src="https://microanalytics.io/js/script.js"
        strategy="afterInteractive"
        data-host="https://microanalytics.io"
        data-dnt="false"
        id="ZwSg9rf6GA"
        async
        defer
      />

      <ThemeProvider attribute="class">
        <Component {...pageProps} />
      </ThemeProvider>
    </>
  );
}
