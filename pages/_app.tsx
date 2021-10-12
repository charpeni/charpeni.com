import '@/styles/global.css';
import '@/styles/prism-vsc-dark-plus.css';

import { AppProps } from 'next/app';
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
