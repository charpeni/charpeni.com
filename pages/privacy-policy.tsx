import Container from '@/components/Container';
import { LegalContent } from '@/components/LegalContent';
import { getAllPostsFrontMatter } from '@/utils/mdx';

export default function PrivacyPolicy() {
  return (
    <Container
      title="Privacy Policy | Nicolas Charpentier"
      description="Privacy policy for charpeni.com."
      noIndex
    >
      <div className="flex flex-col justify-center items-start max-w-2xl mx-auto mb-16">
        <h1 className="font-bold text-3xl md:text-5xl tracking-tight mb-4 text-black dark:text-white">
          PRIVACY POLICY
        </h1>
        <div className="max-w-prose text-gray-600 dark:text-gray-400">
          <LegalContent variant="privacy-policy" />
        </div>
      </div>
    </Container>
  );
}

export async function getStaticProps() {
  const posts = getAllPostsFrontMatter();
  return { props: { retroPosts: posts } };
}
