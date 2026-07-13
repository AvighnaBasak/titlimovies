import Link from "next/link";

const COLS = [
  { heading: "Browse", links: [
    { label: "Home", href: "/" },
    { label: "TV Shows", href: "/tv-shows" },
    { label: "Movies", href: "/movies" },
    { label: "My List", href: "/my-list" },
  ]},
  { heading: "Genres", links: [
    { label: "Action", href: "/movies" },
    { label: "Comedy", href: "/movies" },
    { label: "Drama", href: "/movies" },
    { label: "Anime", href: "/tv-shows" },
  ]},
  { heading: "Help", links: [
    { label: "FAQ", href: "/" },
    { label: "Account", href: "/" },
    { label: "Privacy", href: "/" },
    { label: "Terms of Use", href: "/" },
  ]},
];

export default function Footer() {
  return (
    <footer className="bg-black border-t border-white/10 pt-10 pb-8 px-6 md:px-12 mt-8">
      <div className="max-w-6xl mx-auto">
        <Link href="/">
          <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-purple-700">
            TITLIMOVIES
          </span>
        </Link>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-6">
          {COLS.map((col) => (
            <div key={col.heading}>
              <h3 className="text-gray-300 font-semibold text-sm mb-3">{col.heading}</h3>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-gray-500 hover:text-white text-sm transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="col-span-2 md:col-span-1">
            <h3 className="text-gray-300 font-semibold text-sm mb-3">About</h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              Your destination for movies, TV shows, and anime — beautifully organized.
            </p>
          </div>
        </div>

        <div className="border-t border-white/10 mt-8 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-gray-600 text-xs">© {new Date().getFullYear()} TitliMovies. Made by Avighna Basak.</p>
          <p className="text-gray-600 text-xs">For educational purposes only.</p>
        </div>
      </div>
    </footer>
  );
}
