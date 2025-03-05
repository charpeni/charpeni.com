import SocialIcon from '@/components/SocialIcon';

export default function MySocials() {
  return (
    <div className="flex flex-row items-center space-x-2">
      <SocialIcon url="https://github.com/charpeni" />
      <SocialIcon url="https://twitter.com/charpeni_" />
      <SocialIcon url="https://www.linkedin.com/in/nicolas-charpentier-8a2b8a104/" />
      <SocialIcon url="mailto:nicolas.charpentier079@gmail.com" />
    </div>
  );
}
