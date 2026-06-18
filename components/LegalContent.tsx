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
        <p>
          This website (<a href="https://charpeni.com">https://charpeni.com</a>) does not
          directly collect personal data on behalf of its author (Nicolas
          Charpentier) and uses no cookies.
        </p>
        <p className="mt-4">
          This website is hosted on Vercel (<a href="https://vercel.com">https://vercel.com</a>).
          As such, when loading this website, your IP address will be available
          to Vercel and may be stored in their access logs, along with the
          information which page specifically you loaded.
        </p>
        <p className="mt-4">
          From this website, you can visit other websites by following hyperlinks
          to such external sites. These other sites may have different privacy
          policies and terms which are beyond control of the author of{' '}
          <a href="https://charpeni.com">https://charpeni.com</a>. See this
          website&apos;s <NextLink href="/disclaimer">Legal Disclaimer</NextLink> for
          more information.
        </p>
      </>
    );
  }

  return (
    <>
      <h2 className="prose font-bold">WEBSITE DISCLAIMER</h2>
      <p>
        The information provided by Nicolas Charpentier (&quot;we&quot;, &quot;us&quot;,
        &quot;our&quot;) on <a href="https://charpeni.com">https://charpeni.com</a> (the
        &quot;Site&quot;) is for general informational purposes only. All information
        on the Site is provided in good faith, however we make no representation
        or warranty of any kind, express or implied, regarding the accuracy,
        adequacy, validity, reliability, availability or completeness of any
        information on the Site. UNDER NO CIRCUMSTANCE SHALL WE HAVE ANY
        LIABILITY TO YOU FOR ANY LOSS OR DAMAGE OF ANY KIND INCURRED AS A RESULT
        OF THE USE OF THE SITE OR RELIANCE ON ANY INFORMATION PROVIDED ON THE
        SITE. YOUR USE OF THIS SITE AND YOUR RELIANCE ON ANY INFORMATION ON THE
        SITE IS SOLELY AT YOUR OWN RISK.
      </p>
      <h2 className="prose mt-4 font-bold">EXTERNAL LINKS DISCLAIMER</h2>
      <p>
        The Site may contain (or you may be sent through the Site) links to other
        websites or content belonging to or originating from third parties or
        links to websites and features in banners or other advertising. Such
        external links are not investigated, monitored, or checked for accuracy,
        adequacy, validity, reliability, availability or completeness by us. WE
        DO NOT WARRANT, ENDORSE, GUARANTEE, OR ASSUME RESPONSIBILITY FOR THE
        ACCURACY OR RELIABILITY OF ANY INFORMATION OFFERED BY THIRD-PARTY
        WEBSITES LINKED THROUGH THE SITE OR ANY WEBSITE OR FEATURE LINKED IN ANY
        BANNER OR OTHER ADVERTISING. WE WILL NOT BE A PARTY TO OR IN ANY WAY BE
        RESPONSIBLE FOR MONITORING ANY TRANSACTION BETWEEN YOU AND THIRD-PARTY
        PROVIDERS OF PRODUCTS OR SERVICES.
      </p>
      <h2 className="prose mt-4 font-bold">TESTIMONIALS DISCLAIMER</h2>
      <p className="mb-4">
        The Site may contain testimonials by users of our products and/or
        services. These testimonials reflect the real-life experiences and
        opinions of such users. However, the experiences are personal to those
        particular users, and may not necessarily be representative of all users
        of our products and/or services. We do not claim, and you should not
        assume, that all users will have the same experiences. YOUR INDIVIDUAL
        RESULTS MAY VARY.
      </p>
      <p className="mb-4">
        The testimonials on the Site are submitted in various forms such as text,
        audio and/or video, and are reviewed by us before being posted. They
        appear on the Site verbatim as given by the users, except for the
        correction of grammar or typing errors. Some testimonials may have been
        shortened for the sake of brevity where the full testimonial contained
        extraneous information not relevant to the general public.
      </p>
      <p>
        The views and opinions contained in the testimonials belong solely to the
        individual user and do not reflect our views and opinions. We are not
        affiliated with users who provide testimonials, and users are not paid or
        otherwise compensated for their testimonials.
      </p>
    </>
  );
}
