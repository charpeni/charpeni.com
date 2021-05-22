import MySocials from '@/components/MySocials';

export default function Footer() {
  return (
    <footer className="flex flex-col justify-center items-start max-w-2xl mx-auto w-full mb-8">
      <hr className="w-full border-1 border-gray-200 dark:border-gray-800 mb-8" />
      <div className="flex justify-center max-w-2xl mx-auto w-full">
        <MySocials />
      </div>
    </footer>
  );
}
