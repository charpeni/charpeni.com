import NextLink from 'next/link';

type LegalContentProps = {
  variant: 'disclaimer' | 'privacy-policy';
};

export const LEGAL_TITLES: Record<LegalContentProps['variant'], string> = {
  disclaimer: 'DISCLAIMER',
  'privacy-policy': 'PRIVACY POLICY',
};

export function LegalContent({ variant }: LegalContentProps) {
  if (variant === 'privacy-policy') {
    return (
      <>
        <p>Last updated: June 29, 2026.</p>
        <p>
          This website (<a href="https://charpeni.com">https://charpeni.com</a>)
          is the personal website of Nicolas Charpentier. It is intended to
          collect as little personal information as practical while still
          keeping the site reliable and understandable.
        </p>
        <h2 className="prose mt-4 font-bold">Hosting and Analytics</h2>
        <p className="mt-4">
          This website is hosted on Vercel (
          <a href="https://vercel.com">https://vercel.com</a>). When loading
          this website, your IP address and request details may be available to
          Vercel and stored in their access logs.
        </p>
        <p className="mt-4">
          The site uses Pirsch Analytics and Vercel Speed Insights to understand
          aggregate usage and performance. These services may process request,
          device, browser, page, and performance information. The site does not
          use these tools to identify individual visitors.
        </p>
        <h2 className="prose mt-4 font-bold">Cookies and Local Storage</h2>
        <p className="mt-4">
          This website uses a first-party cookie named <code>retro-os</code> to
          remember whether retro mode is enabled. The cookie is used only for
          this preference and expires after one year.
        </p>
        <p className="mt-4">
          Retro mode may also use your browser&apos;s local storage to remember
          the terminal cursor position. This value stays in your browser unless
          you clear your site data.
        </p>
        <h2 className="prose mt-4 font-bold">Comments and Embeds</h2>
        <p className="mt-4">
          Some pages include third-party features, such as Giscus comments
          backed by GitHub Discussions or interactive CodeSandbox/Sandpack
          examples. When those features load or when you interact with them, the
          relevant third parties may receive information from your browser and
          process it under their own privacy policies.
        </p>
        <h2 className="prose mt-4 font-bold">External Links</h2>
        <p className="mt-4">
          This website links to external websites. Those sites may have
          different privacy policies and terms which are outside the
          author&apos;s control. See this website&apos;s{' '}
          <NextLink href="/disclaimer">Legal Disclaimer</NextLink> for more
          information.
        </p>
      </>
    );
  }

  return (
    <>
      <p>Last updated: June 29, 2026.</p>
      <h2 className="prose font-bold">WEBSITE DISCLAIMER</h2>
      <p>
        The information provided by Nicolas Charpentier on{' '}
        <a href="https://charpeni.com">https://charpeni.com</a> is for general
        informational and educational purposes only. Although the information is
        shared in good faith, no representation or warranty is made regarding
        its accuracy, completeness, reliability, availability, or suitability
        for any particular purpose.
      </p>
      <h2 className="prose mt-4 font-bold">TECHNICAL CONTENT DISCLAIMER</h2>
      <p>
        Articles, code snippets, configuration examples, security notes, and
        dependency-management guidance are provided as-is. Software ecosystems
        change quickly, and examples may become outdated or may not fit your
        environment. You are responsible for reviewing, testing, and validating
        anything you use from this site before applying it to your own systems,
        projects, or organization.
      </p>
      <p className="mt-4">
        Your use of the site and reliance on any information from it is at your
        own risk. To the fullest extent permitted by law, Nicolas Charpentier is
        not responsible for any loss or damage resulting from your use of the
        site or its content.
      </p>
      <h2 className="prose mt-4 font-bold">EXTERNAL LINKS DISCLAIMER</h2>
      <p>
        The site contains links to third-party websites and may include
        third-party embeds or widgets, such as comments or interactive code
        examples. These third-party resources are provided for convenience and
        context only. They are not controlled, monitored, or guaranteed by the
        author, and their content, availability, accuracy, security, and
        policies remain the responsibility of their respective providers.
      </p>
      <h2 className="prose mt-4 font-bold">COMMENTS AND USER CONTENT</h2>
      <p className="mb-4">
        Some pages may display comments or discussions hosted by third-party
        services. User-generated content belongs to its respective authors and
        does not necessarily reflect the views of Nicolas Charpentier.
      </p>
      <h2 className="prose mt-4 font-bold">NO ENDORSEMENT</h2>
      <p>
        References to tools, libraries, services, companies, or projects do not
        imply endorsement, sponsorship, or affiliation unless explicitly stated.
      </p>
    </>
  );
}
