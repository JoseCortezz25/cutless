import Link from "next/link";

export const Navbar = () => {
  return (
    <header className="w-full py-6 px-6">
      <div className="container mx-auto flex justify-between">
        <div className="flex items-center gap-4">
          <Link href="/">
            <span className="text-2xl font-bold">Cutless AI</span>
          </Link>
        </div>
      </div>
    </header>
  );
};
