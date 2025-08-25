import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-gray-950 border-t border-gray-800 py-8 px-4 mt-12">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <Link href="/" className="text-xl font-bold text-white mb-4 block">
              TitliMovies
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed">
              Your ultimate destination for movies, TV shows, and anime streaming.
            </p>
          </div>
          
          <div>
            <h3 className="text-white font-semibold mb-4">Browse</h3>
            <div className="space-y-2">
              <Link href="/?type=movie" className="text-gray-400 hover:text-white text-sm block transition-colors">
                Movies
              </Link>
              <Link href="/?type=tv" className="text-gray-400 hover:text-white text-sm block transition-colors">
                TV Shows
              </Link>
              <Link href="/?type=anime" className="text-gray-400 hover:text-white text-sm block transition-colors">
                Anime
              </Link>
            </div>
          </div>
          
          <div>
            <h3 className="text-white font-semibold mb-4">Categories</h3>
            <div className="space-y-2">
              <span className="text-gray-400 text-sm block">Action</span>
              <span className="text-gray-400 text-sm block">Comedy</span>
              <span className="text-gray-400 text-sm block">Drama</span>
              <span className="text-gray-400 text-sm block">Thriller</span>
            </div>
          </div>
          
          <div>
            <h3 className="text-white font-semibold mb-4">Info</h3>
            <div className="space-y-2">
              <span className="text-gray-400 text-sm block">About Us</span>
              <span className="text-gray-400 text-sm block">Contact</span>
              <span className="text-gray-400 text-sm block">Privacy Policy</span>
              <span className="text-gray-400 text-sm block">Terms of Service</span>
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-8 pt-6 text-center">
          <p className="text-gray-400 text-sm">
            © 2024 TitliMovies. Made By Avighna Basak. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
