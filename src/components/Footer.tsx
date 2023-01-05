import MySocials from './MySocials';

function Separator({ className }: { className?: string }) {
  return <span className={`${className} px-1`}>|</span>;
}

export default function Footer() {
  return (
    <footer className="flex flex-col justify-center items-start max-w-2xl mx-auto w-full mb-8">
      <hr className="w-full border-1 border-gray-200 dark:border-gray-800 mb-8" />
      <div className="flex justify-center max-w-2xl mx-auto w-full">
        <MySocials />
      </div>
      <div className="flex flex-col justify-center items-center max-w-2xl mx-auto w-full mt-2 text-sm text-gray-400 dark:text-gray-600">
        <div className="mb-2">
          <a href="/disclaimer">Disclaimer</a>
          <Separator />
          <a href="/privacy-policy">Privacy Policy</a>
        </div>
        <div className="flex flex-col md:flex-row items-center">
          <span className="mr-1">© 2021-present Nicolas Charpentier.</span>{' '}
          <span>All Rights Reserved.</span>
        </div>
      </div>
    </footer>
  );
}
