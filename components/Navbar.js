import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="w-full max-w-full bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950 border-b border-gray-700/50 backdrop-blur-sm py-4 px-4 md:px-6 flex items-center justify-start shadow-xl overflow-x-hidden">
      <Link href="/" className="text-2xl font-bold tracking-tight text-transparent bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text hover:from-blue-300 hover:to-purple-300 transition-all">
        TitliMovies
      </Link>
    </nav>
  );
} 
