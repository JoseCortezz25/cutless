import Link from 'next/link';

export const Navbar = () => {
  return (
    <header className="w-full px-6 py-6">
      <div className="container mx-auto flex justify-between">
        <div className="flex items-center gap-4">
          <Link href="/">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="Cutless AI" className="h-10 w-10" />
              <span className="font-montserrat text-2xl font-bold">
                Cutless AI
              </span>
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
};
