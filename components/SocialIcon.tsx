import {
  SocialIcon as ReactSocialIcon,
  SocialIconDatabase,
} from 'react-social-icons/build/react-social-icons-lite';

// Supported network icons
import GitHub from 'react-social-icons/build/networks/github';
import Twitter from 'react-social-icons/build/networks/twitter';
import LinkedIn from 'react-social-icons/build/networks/linkedin';
import MailTo from 'react-social-icons/build/networks/mailto';

SocialIconDatabase.importNetwork(GitHub)
  .importNetwork(Twitter)
  .importNetwork(LinkedIn)
  .importNetwork(MailTo);

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
