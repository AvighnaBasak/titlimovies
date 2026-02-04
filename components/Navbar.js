
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 0) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      // Default to movie type search or universal if supported
      router.push(`/?q=${encodeURIComponent(query)}&type=movie`);
    }
  };

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-colors duration-500 ease-in-out ${isScrolled ? "bg-[#141414]" : "bg-gradient-to-b from-black/80 to-transparent"
        }`}
    >
      <div className="flex items-center justify-between px-2 md:px-12 py-2 md:py-4">
        {/* Left: Logo & Links */}
        <div className="flex items-center gap-4 md:gap-8">
          <Link href="/">
            <span className="text-xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-purple-700 cursor-pointer">
              TITLIMOVIES
            </span>
          </Link>
          <ul className="hidden lg:flex gap-6 text-sm font-light text-gray-300">
            <li className="hover:text-white transition cursor-pointer">Home</li>
            <li className="hover:text-white transition cursor-pointer">TV Shows</li>
            <li className="hover:text-white transition cursor-pointer">Movies</li>
            <li className="hover:text-white transition cursor-pointer">New & Popular</li>
            <li className="hover:text-white transition cursor-pointer">My List</li>
          </ul>
        </div>

        {/* Right: Search & Profile */}
        <div className="flex items-center gap-2 md:gap-6">
          {/* Search Bar */}
          <div className={`flex items-center border-white transition-all duration-300 ${showSearch ? "border p-1 pl-2 bg-black/50 absolute right-16 md:static" : "border-0"}`}>
            <button onClick={() => setShowSearch(!showSearch)}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 md:w-6 md:h-6 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </button>
            <form onSubmit={handleSearch}>
              <input
                type="text"
                placeholder="Titles..."
                className={`bg-transparent text-white text-sm outline-none ml-2 transition-all duration-300 ${showSearch ? "w-32 md:w-48 opacity-100" : "w-0 opacity-0"
                  }`}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (e.target.value === "") router.push("/");
                }}
                onBlur={() => !query && setShowSearch(false)}
              />
            </form>
          </div>

          <span className="cursor-pointer text-gray-300 hover:text-white hidden lg:block">Butterfly</span>

          {/* Bell Icon */}
          <button className="text-white hover:text-gray-300">
            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-5 h-5 md:w-6 md:h-6">
              <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z" />
            </svg>
          </button>

          {/* Profile Avatar */}
          <div className="flex items-center gap-2 cursor-pointer group relative">
            <div className="w-6 h-6 md:w-8 md:h-8 rounded bg-purple-600 flex items-center justify-center text-white font-bold text-xs md:text-base">
              T
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" fill="white" viewBox="0 0 24 24" className="w-3 h-3 md:w-4 md:h-4 transition-transform group-hover:rotate-180">
              <path d="M7 10l5 5 5-5z" />
            </svg>
          </div>
        </div>
      </div>
    </nav>
  );
}
