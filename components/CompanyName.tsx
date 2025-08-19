type Props = {
  children: string;
  className?: string;
};

export default function CompanyName({
  children: companyName,
  className,
}: Props) {
  return (
    <span
      className={`font-bold text-black dark:text-white underline decoration-2 ${
        className ?? ''
      }`}
    >
      {companyName}
    </span>
  );
}
