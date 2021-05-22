import { SocialIcon } from 'react-social-icons';

export default function CustomSocialIcon(props) {
  return (
    <div className="rounded-full hover:bg-gray-100">
      <SocialIcon
        bgColor="transparent"
        fgColor="#757575"
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      />
    </div>
  );
}
