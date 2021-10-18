export default function CompanyName({ children, className }) {
  return (
    <span
      className={`${
        className ? className : ''
      } font-bold text-black dark:text-white`}
    >
      {children}
    </span>
  );
}
