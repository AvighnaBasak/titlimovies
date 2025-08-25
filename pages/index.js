import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import SearchBar from "../components/SearchBar";
import ToggleSwitch from "../components/ToggleSwitch";
import MediaGrid from "../components/MediaGrid";
import Footer from "../components/Footer";

const TABS = ["movie", "tv", "anime"];

export default function Home() {
  const [tab, setTab] = useState("movie");
  const [trendingMedia, setTrendingMedia] = useState([]);
  const [latestMedia, setLatestMedia] = useState([]);
  const [comingSoonMedia, setComingSoonMedia] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch all media sections
  useEffect(() => {
    setLoading(true);
    
    const fetchData = async () => {
      try {
        let trendingUrl = "";
        let latestUrl = "";
        let comingSoonUrl = "";
        
        if (tab === "movie") {
          trendingUrl = `/api/proxy?url=${encodeURIComponent("https://api.2embed.cc/trending?time_window=week&page=1")}`;
          latestUrl = `/api/proxy?url=${encodeURIComponent("https://api.2embed.cc/trending?time_window=day&page=1")}`;
          comingSoonUrl = `/api/proxy?url=${encodeURIComponent("https://api.2embed.cc/trending?time_window=month&page=1")}`;
        } else if (tab === "tv") {
          trendingUrl = `/api/proxy?url=${encodeURIComponent("https://api.2embed.cc/trendingtv?time_window=week&page=1")}`;
          latestUrl = `/api/proxy?url=${encodeURIComponent("https://api.2embed.cc/trendingtv?time_window=day&page=1")}`;
          comingSoonUrl = `/api/proxy?url=${encodeURIComponent("https://api.2embed.cc/trendingtv?time_window=month&page=1")}`;
        } else if (tab === "anime") {
          trendingUrl = `/api/proxy?url=${encodeURIComponent("https://animeapi.skin/trending")}`;
          latestUrl = `/api/proxy?url=${encodeURIComponent("https://animeapi.skin/new?page=1")}`;
          comingSoonUrl = `/api/proxy?url=${encodeURIComponent("https://animeapi.skin/new?page=2")}`;
        }

        const [trendingRes, latestRes, comingSoonRes] = await Promise.all([
          fetch(trendingUrl),
          fetch(latestUrl),
          fetch(comingSoonUrl)
        ]);

        const [trendingData, latestData, comingSoonData] = await Promise.all([
          trendingRes.json(),
          latestRes.json(),
          comingSoonRes.json()
        ]);

        setTrendingMedia(trendingData.results || trendingData || []);
        setLatestMedia(latestData.results || latestData || []);
        setComingSoonMedia(comingSoonData.results || comingSoonData || []);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, [tab]);

  return (
    <div className="min-h-screen w-full max-w-full bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white overflow-x-hidden">
      <Navbar />
      
      {/* Search Section */}
      <SearchBar hideTypeSelector={true} />
      
      {/* Hero Section */}
      <div className="relative w-full overflow-x-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10" />
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-8 md:py-12">
          <div className="text-center mb-8 md:mb-12">
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent leading-tight">
              Welcome to TitliMovies
            </h1>
            <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed px-4">
              Discover and stream the latest movies, TV shows, and anime all in one place
            </p>
          </div>
          
          <div className="flex flex-col items-center justify-center gap-4 md:gap-6 mb-8 md:mb-12">
            <ToggleSwitch value={tab} onChange={setTab} options={TABS} />
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 md:py-8 w-full space-y-12">
        
        {/* Trending Section */}
        <section>
          <div className="mb-6 md:mb-8">
            <h2 className="text-2xl md:text-3xl font-bold mb-2 text-white">
              Trending {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </h2>
            <p className="text-gray-400">
              Discover what's popular right now
            </p>
          </div>
          
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-6">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-gray-800 rounded-2xl h-60 md:h-72 mb-3 md:mb-4" />
                  <div className="bg-gray-700 h-3 md:h-4 rounded mb-1 md:mb-2" />
                  <div className="bg-gray-700 h-2 md:h-3 rounded w-12 md:w-16" />
                </div>
              ))}
            </div>
          ) : (
            <MediaGrid items={trendingMedia} type={tab} />
          )}
        </section>

        {/* Latest Section */}
        <section>
          <div className="mb-6 md:mb-8">
            <h2 className="text-2xl md:text-3xl font-bold mb-2 text-white">
              Latest {tab === "anime" ? "Anime" : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </h2>
            <p className="text-gray-400">
              Recently {tab === "anime" ? "released episodes" : "added content"}
            </p>
          </div>
          
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-6">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-gray-800 rounded-2xl h-60 md:h-72 mb-3 md:mb-4" />
                  <div className="bg-gray-700 h-3 md:h-4 rounded mb-1 md:mb-2" />
                  <div className="bg-gray-700 h-2 md:h-3 rounded w-12 md:w-16" />
                </div>
              ))}
            </div>
          ) : (
            <MediaGrid items={latestMedia} type={tab} />
          )}
        </section>

        {/* Coming Soon Section */}
        <section>
          <div className="mb-6 md:mb-8">
            <h2 className="text-2xl md:text-3xl font-bold mb-2 text-white">
              {tab === "anime" ? "More New Anime" : "Coming Soon"}
            </h2>
            <p className="text-gray-400">
              {tab === "anime" ? "Fresh anime releases" : "Upcoming releases to watch"}
            </p>
          </div>
          
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-6">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-gray-800 rounded-2xl h-60 md:h-72 mb-3 md:mb-4" />
                  <div className="bg-gray-700 h-3 md:h-4 rounded mb-1 md:mb-2" />
                  <div className="bg-gray-700 h-2 md:h-3 rounded w-12 md:w-16" />
                </div>
              ))}
            </div>
          ) : (
            <MediaGrid items={comingSoonMedia} type={tab} />
          )}
        </section>

      </div>
      
      <Footer />
    </div>
  );
} 
