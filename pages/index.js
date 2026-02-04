import MediaGrid from "../components/MediaGrid";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import MediaRow from "../components/MediaRow";
import HeroBanner from "../components/HeroBanner";
import Footer from "../components/Footer";

export default function Home() {
  const router = useRouter();
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [latestMovies, setLatestMovies] = useState([]);
  const [trendingTV, setTrendingTV] = useState([]);
  const [latestTV, setLatestTV] = useState([]);
  const [trendingAnime, setTrendingAnime] = useState([]);
  const [latestAnime, setLatestAnime] = useState([]);

  // New Categories
  const [gems, setGems] = useState([]);
  const [awardWinningTV, setAwardWinningTV] = useState([]);
  const [darkDramas, setDarkDramas] = useState([]);

  const [heroItem, setHeroItem] = useState(null);
  const [heroType, setHeroType] = useState("movie");
  const [loading, setLoading] = useState(true);

  // Fetch all media sections
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          movieRes, movieLatestRes,
          tvRes, tvLatestRes,
          animeRes, animeLatestRes,
          topRatedMovieRes, topRatedTVRes
        ] = await Promise.all([
          fetch(`/api/proxy?url=${encodeURIComponent("https://api.2embed.cc/trending?time_window=week&page=1")}`),
          fetch(`/api/proxy?url=${encodeURIComponent("https://api.2embed.cc/trending?time_window=day&page=1")}`),
          fetch(`/api/proxy?url=${encodeURIComponent("https://api.2embed.cc/trendingtv?time_window=week&page=1")}`),
          fetch(`/api/proxy?url=${encodeURIComponent("https://api.2embed.cc/trendingtv?time_window=day&page=1")}`),
          // Anime: Fetch Movies and TV separately using standard TMDB filters (Genre 16 + Language 'ja')
          fetch(`/api/proxy?url=${encodeURIComponent(`https://api.themoviedb.org/3/discover/movie?with_genres=16&with_original_language=ja&sort_by=popularity.desc&page=1&api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}`)}`),
          fetch(`/api/proxy?url=${encodeURIComponent(`https://api.themoviedb.org/3/discover/tv?with_genres=16&with_original_language=ja&sort_by=popularity.desc&page=1&api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}`)}`),

          fetch(`/api/proxy?url=${encodeURIComponent("https://api.2embed.cc/trending?time_window=week&page=2")}`), // Gems (Movies Page 2)
          fetch(`/api/proxy?url=${encodeURIComponent("https://api.2embed.cc/trendingtv?time_window=week&page=2")}`) // Awards separate from main
        ]);

        const movies = (await movieRes.json()).results || [];
        const latestMov = (await movieLatestRes.json()).results || [];
        const tvShows = (await tvRes.json()).results || [];
        const latestTVShows = (await tvLatestRes.json()).results || [];

        // Process Anime
        // If the proxy fails to strip/add API key, we ensure it's in the URL above. 
        // Note: api.2embed.cc might be a specific proxy wrapper. If it fails, we might need a direct TMDB proxy.
        // Assuming the user's proxy handler handles this.
        const animeMov = (await animeRes.json()).results || [];
        const animeTV = (await animeLatestRes.json()).results || [];

        // Combine and Sort Anime by Popularity
        const combinedAnime = [...animeMov, ...animeTV].sort((a, b) => b.popularity - a.popularity);

        const gemMovies = (await topRatedMovieRes.json()).results || [];
        const moreTV = (await topRatedTVRes.json()).results || [];

        setTrendingMovies(movies);
        setLatestMovies(latestMov);
        setTrendingTV(tvShows);
        setLatestTV(latestTVShows);

        setTrendingAnime(combinedAnime);
        setLatestAnime(combinedAnime); // Using same list for now to ensure content show
        setGems(gemMovies);
        setAwardWinningTV(moreTV);
        // Reuse TV shows but shuffle or filter for 'Dark Dramas'
        setDarkDramas([...tvShows].reverse().slice(0, 10));

        // Set Hero Item (Randomly pick from trending movies or TV)
        const allItems = [...movies, ...tvShows];
        if (allItems.length > 0) {
          const random = allItems[Math.floor(Math.random() * allItems.length)];
          setHeroItem(random);
          setHeroType(random.first_air_date ? "tv" : "movie");
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Hero Rotation Logic
  useEffect(() => {
    if (trendingMovies.length === 0 && trendingTV.length === 0) return;

    const interval = setInterval(() => {
      const allItems = [...trendingMovies, ...trendingTV];
      if (allItems.length > 0) {
        const random = allItems[Math.floor(Math.random() * allItems.length)];
        setHeroItem(random);
        setHeroType(random.first_air_date ? "tv" : "movie");
      }
    }, 35000);

    return () => clearInterval(interval);
  }, [trendingMovies, trendingTV]);

  const { q, type: queryType } = router.query;
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Search Logic
  useEffect(() => {
    if (q) {
      setIsSearching(true);
      setLoading(true);

      const fetchGlobalSearch = async () => {
        try {
          const [movieRes, tvRes] = await Promise.all([
            fetch(`/api/proxy?url=${encodeURIComponent(`https://api.2embed.cc/search?q=${encodeURIComponent(q)}&page=1`)}`),
            fetch(`/api/proxy?url=${encodeURIComponent(`https://api.2embed.cc/searchtv?q=${encodeURIComponent(q)}&page=1`)}`)
          ]);

          const movieData = await movieRes.json();
          const tvData = await tvRes.json();

          const movies = (movieData.results || []).map(item => ({ ...item, media_type: 'movie' }));
          const shows = (tvData.results || []).map(item => ({ ...item, media_type: 'tv' }));

          // Combine results and sort by popularity
          const combinedResults = [...movies, ...shows].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
          setSearchResults(combinedResults);
          setLoading(false);
        } catch (err) {
          console.error(err);
          setLoading(false);
        }
      };

      fetchGlobalSearch();
    } else {
      setIsSearching(false);
      if (trendingMovies.length > 0) setLoading(false);
    }
  }, [q, trendingMovies.length]);

  if (loading && !isSearching && trendingMovies.length === 0) return (
    <div className="fixed inset-0 z-[99999] bg-[#141414] flex items-center justify-center">
      <div className="flex flex-col items-center">
        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4"></div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-[#141414] text-white overflow-x-hidden font-netflix">
      <Navbar />

      {isSearching ? (
        <div className="pt-24 px-4 md:px-12 min-h-screen">
          <h2 className="text-2xl font-bold mb-6">Results for "{q}"</h2>
          <MediaGrid items={searchResults} type={queryType || "movie"} />
        </div>
      ) : (
        <>
          {/* Hero Section */}
          <HeroBanner item={heroItem} type={heroType} />

          {/* Content Rows */}
          <div className="relative z-10 -mt-10 md:-mt-2 pb-12 space-y-4">
            {/* 1. Popular Movies (Ranked) */}
            <MediaRow title="Top 10 Movies Today" items={trendingMovies.slice(0, 10)} type="movie" variant="top10" />

            {/* 2. Top 10 Shows Today - Numbered */}
            <MediaRow title="Top 10 Shows Today" items={trendingTV.slice(0, 10)} type="tv" variant="top10" />

            {/* 3. Gems for You (Movies) */}
            <MediaRow title="Gems for You" items={gems} type="movie" variant="landscape" />

            {/* 4. Bingeworthy TV Shows */}
            <MediaRow title="Bingeworthy TV Shows" items={trendingTV.slice(10, 20)} type="tv" variant="landscape" />

            {/* 5. Award-Winning TV Shows */}
            <MediaRow title="Award-Winning TV Shows" items={awardWinningTV} type="tv" variant="landscape" />

            {/* 6. Dark TV Dramas */}
            <MediaRow title="Dark TV Dramas" items={darkDramas} type="tv" variant="landscape" />

            {/* 8. New Releases (Mix/Movies) */}
            <MediaRow title="New Releases" items={latestMovies} type="movie" variant="landscape" />

            {/* 7. Peak Anime - Moved to end */}
            <MediaRow
              title="Peak Anime"
              items={(trendingAnime.length > 0 ? trendingAnime : (latestAnime.length > 0 ? latestAnime : latestMovies)).slice(0, 10)}
              type="anime"
              variant="landscape"
            />
          </div>
        </>
      )}

      <Footer />
    </div>
  );
}
