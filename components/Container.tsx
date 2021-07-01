import Head from 'next/head';
import { useRouter } from 'next/router';

import Footer from '@/components/Footer';
import Header from '@/components/Header';

export default function Container(props) {
  const { children, ...customMeta } = props;
  const router = useRouter();
  const meta = {
    title: 'Nicolas Charpentier – Website',
    description: 'My personal website and blog.',
    type: 'website',
    ...customMeta,
  };

  return (
    <div className="bg-white dark:bg-black">
      <Head>
        <title>{meta.title}</title>
        <meta name="robots" content="follow, index" />
        <meta content={meta.description} name="description" />
        <meta
          property="og:url"
          content={`https://charpeni.com${router.asPath}`}
        />
        <link rel="canonical" href={`https://charpeni.com${router.asPath}`} />
        <meta property="og:type" content={meta.type} />
        <meta property="og:site_name" content="Nicolas Charpentier" />
        <meta property="og:description" content={meta.description} />
        <meta property="og:title" content={meta.title} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@charpeni_" />
        <meta name="twitter:title" content={meta.title} />
        <meta name="twitter:description" content={meta.description} />
        {meta.date && (
          <meta property="article:published_time" content={meta.date} />
        )}
      </Head>
      <Header />
      <main
        id="skip"
        className="flex flex-col justify-center bg-white dark:bg-black px-8"
      >
        {children}
        <Footer />
      </main>
    </div>
  );
}
