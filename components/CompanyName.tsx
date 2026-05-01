type Props = {
  children: string;
  className?: string;
  href?: string;
};

export default function CompanyName({
  children: companyName,
  className,
  href,
}: Props) {
  const classes = `font-bold text-black dark:text-white underline decoration-3 ${
    className ?? ''
  }`;

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`not-prose ${classes}`}
      >
        {companyName}
      </a>
    );
  }

  return <span className={classes}>{companyName}</span>;
}
