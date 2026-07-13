import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { motion, useScroll, useTransform } from "framer-motion";

const LINKS = [
  { label: "Home", href: "/" },
  { label: "TV Shows", href: "/tv-shows" },
  { label: "Movies", href: "/movies" },
  { label: "My List", href: "/my-list" },
];

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const router = useRouter();

  const { scrollY } = useScroll();
  const bgOpacity = useTransform(scrollY, [0, 80], [0, 0.92]);
  const gradientOpacity = useTransform(scrollY, [0, 80], [1, 0]);

  useEffect(() => {
    const handleCheck = () => {
      setIsMobile(window.innerWidth < 768);
      setIsScrolled(window.scrollY > 0);
    };
    const handleScroll = () => setIsScrolled(window.scrollY > 0);
    handleCheck();
    window.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", handleCheck);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleCheck);
    };
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) router.push(`/?q=${encodeURIComponent(query)}`);
  };

  const isActive = (href) =>
    href === "/" ? router.pathname === "/" && !router.query.q : router.pathname === href;

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-500 ease-in-out ${
        !isMobile ? (isScrolled ? "bg-[#141414] shadow-lg" : "bg-gradient-to-b from-black/80 to-transparent") : ""
      }`}
    >
      {isMobile && (
        <>
          <motion.div className="absolute inset-0 -z-10" style={{ opacity: bgOpacity, backgroundColor: "#141414", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }} />
          <motion.div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/80 to-transparent" style={{ opacity: gradientOpacity }} />
        </>
      )}

      <div className="flex items-center justify-between px-4 md:px-12 py-3 md:py-4">
        {/* Left: Logo & Links */}
        <div className="flex items-center gap-4 md:gap-8">
          <Link href="/">
            <span className="text-xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-purple-700 cursor-pointer">
              TITLIMOVIES
            </span>
          </Link>
          <ul className="hidden lg:flex items-center gap-2 text-sm text-gray-300">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className={`px-3 py-1.5 rounded-full transition ${
                    isActive(l.href)
                      ? "bg-white/20 text-white font-semibold"
                      : "font-light hover:text-white"
                  }`}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Right: Search & Profile */}
        <div className="flex items-center gap-4 md:gap-6">
          <div className={`flex items-center border-white transition-all duration-300 ${showSearch ? "border p-1 pl-2 bg-black/50 absolute right-4 md:static z-50" : "border-0"}`}>
            <button onClick={() => setShowSearch(!showSearch)} aria-label="Search">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </button>
            <form onSubmit={handleSearch}>
              <input
                type="text"
                placeholder="Titles..."
                className={`bg-transparent text-white text-sm outline-none ml-2 transition-all duration-300 ${showSearch ? "w-32 md:w-48 opacity-100" : "w-0 opacity-0"}`}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (e.target.value === "") router.push("/");
                }}
                onBlur={() => !query && setShowSearch(false)}
                autoFocus={showSearch}
              />
            </form>
          </div>

          <button className="text-white hover:text-gray-300 hidden md:block" aria-label="Notifications">
            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-6 h-6">
              <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z" />
            </svg>
          </button>

          <div className="flex items-center gap-2 cursor-pointer group relative">
            <div className="w-8 h-8 rounded bg-purple-600 flex items-center justify-center text-white font-bold">T</div>
            <svg xmlns="http://www.w3.org/2000/svg" fill="white" viewBox="0 0 24 24" className="hidden md:block w-4 h-4 transition-transform group-hover:rotate-180">
              <path d="M7 10l5 5 5-5z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Mobile sub-nav — the desktop links are hidden below lg, so give phones
          a scrollable pill row to reach the browse pages. */}
      <ul className="lg:hidden flex gap-2 px-4 pb-2 overflow-x-auto no-scrollbar text-sm">
        {LINKS.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className={`whitespace-nowrap px-3 py-1 rounded-full transition ${
                isActive(l.href) ? "bg-white/90 text-black font-semibold" : "bg-white/10 text-gray-200"
              }`}
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
