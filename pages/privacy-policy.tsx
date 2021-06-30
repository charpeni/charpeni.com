import NextLink from 'next/link';

import Container from '@/components/Container';

export default function PrivacyPolicy() {
  return (
    <Container>
      <div className="flex flex-col justify-center items-start max-w-2xl mx-auto mb-16">
        <h1 className="font-bold text-3xl md:text-5xl tracking-tight mb-4 text-black dark:text-white">
          PRIVACY POLICY
        </h1>
        <div className="max-w-prose text-gray-600 dark:text-gray-400">
          <p>
            This website (
            <a href="https://charpeni.com">https://charpeni.com</a>) does not
            directly collect personal data on behalf of its author (Nicolas
            Charpentier) and uses no cookies.
          </p>
          <p className="mt-4">
            This website is hosted on Vercel (
            <a href="https://vercel.com">https://vercel.com</a>). As such, when
            loading this website, your IP address will be available to Vercel
            and may be stored in their access logs, along with the information
            which page specifically you loaded.
          </p>
          <p className="mt-4">
            From this website, you can visit other websites by following
            hyperlinks to such external sites. These other sites may have
            different privacy policies and terms which are beyond control of the
            author of <a href="https://charpeni.com">https://charpeni.com</a>.
            See this website&apos;s{' '}
            <NextLink href="/disclaimer">
              <a>Legal Disclaimer</a>
            </NextLink>{' '}
            for more information.
          </p>
        </div>
      </div>
    </Container>
  );
}
