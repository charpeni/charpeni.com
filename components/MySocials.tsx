import SocialIcon from '@/components/SocialIcon';

export default function MySocials() {
  return (
    <div className="flex flex-row items-center space-x-2">
      <SocialIcon url="https://github.com/charpeni" />
      <SocialIcon url="https://www.linkedin.com/in/nicolas-charpentier-8a2b8a104/" />
      <SocialIcon url="https://x.com/charpeni_" />
      <SocialIcon url="https://bsky.app/profile/charpeni.bsky.social" />
      <SocialIcon url="mailto:blog@nicolascharpentier.com" />
    </div>
  );
}
