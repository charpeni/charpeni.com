import { SocialIcon as ReactSocialIcon } from 'react-social-icons';

import type { SocialIconProps } from 'react-social-icons';

export default function SocialIcon(props: SocialIconProps) {
  return (
    <div className="rounded-full hover:bg-gray-100">
      <ReactSocialIcon
        bgColor="transparent"
        fgColor="#757575"
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      />
    </div>
  );
}
