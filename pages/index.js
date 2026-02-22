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

  // New state for Continue Watching
  const [continueWatching, setContinueWatching] = useState([]);

  // Region-based Top 10 & Award-Winning Dramas
  const [userRegion, setUserRegion] = useState({ code: 'US', name: 'the US' });
  const [regionTop10, setRegionTop10] = useState([]);
  const [awardDramas, setAwardDramas] = useState([]);
  const [sciFiFantasy, setSciFiFantasy] = useState([]);
  const [crimeShows, setCrimeShows] = useState([]);

  // Load Continue Watching from localStorage
  useEffect(() => {
    const loadContinueWatching = () => {
      try {
        const history = JSON.parse(localStorage.getItem('continueWatching') || '[]');
        // Filter to only items with valid display data
        const valid = history.filter(item => item.id && (item.poster_path || item.backdrop_path));
        console.log('[CW] Loaded', history.length, 'items,', valid.length, 'valid', valid);
        // Clean up invalid entries from storage
        if (valid.length !== history.length) {
          localStorage.setItem('continueWatching', JSON.stringify(valid));
        }
        setContinueWatching(valid);
      } catch (e) {
        console.error("Failed to load continue watching history", e);
      }
    };

    loadContinueWatching();

    // Listen for updates from other components (InfoModal, Player)
    window.addEventListener('continue-watching-update', loadContinueWatching);
    return () => window.removeEventListener('continue-watching-update', loadContinueWatching);
  }, []);

  // Detect user region via IP geolocation
  useEffect(() => {
    const detectRegion = async () => {
      try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        if (data.country_code && data.country_name) {
          setUserRegion({ code: data.country_code, name: data.country_name });
        }
      } catch (e) {
        console.error('Region detection failed, using default US', e);
      }
    };
    detectRegion();
  }, []);

  // Fetch region-specific Top 10 and Award-Winning TV Dramas
  useEffect(() => {
    const fetchRegionData = async () => {
      try {

        const [regionRes, dramasRes, sciFiRes, crimeRes] = await Promise.all([
          fetch(`/api/tmdb?path=/movie/popular&region=${userRegion.code}&page=1`),
          fetch(`/api/tmdb?path=/discover/tv&with_genres=18&sort_by=vote_average.desc&vote_count.gte=500&page=1`),
          fetch(`/api/tmdb?path=/discover/tv&with_genres=10765&sort_by=popularity.desc&vote_count.gte=200&page=1`),
          fetch(`/api/tmdb?path=/discover/tv&with_genres=80&with_origin_country=US&sort_by=popularity.desc&vote_count.gte=100&page=1`)
        ]);
        const regionData = await regionRes.json();
        const dramasData = await dramasRes.json();
        const sciFiData = await sciFiRes.json();
        const crimeData = await crimeRes.json();
        setRegionTop10((regionData.results || []).slice(0, 10));
        setAwardDramas((dramasData.results || []).slice(0, 10));
        setSciFiFantasy((sciFiData.results || []).slice(0, 20));
        setCrimeShows((crimeData.results || []).slice(0, 20));
      } catch (e) {
        console.error('Failed to fetch region/dramas data', e);
      }
    };
    fetchRegionData();
  }, [userRegion]);

  // Fetch all media sections
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          movieRes, movieLatestRes,
          tvRes, tvLatestRes,
          animeRes, animeRes2,
          topRatedMovieRes, topRatedTVRes
        ] = await Promise.all([
          fetch(`/api/proxy?url=${encodeURIComponent("https://api.2embed.cc/trending?time_window=week&page=1")}`),
          fetch(`/api/proxy?url=${encodeURIComponent("https://api.2embed.cc/trending?time_window=day&page=1")}`),
          fetch(`/api/proxy?url=${encodeURIComponent("https://api.2embed.cc/trendingtv?time_window=week&page=1")}`),
          fetch(`/api/proxy?url=${encodeURIComponent("https://api.2embed.cc/trendingtv?time_window=day&page=1")}`),
          // Peak Anime: Acclaimed + Famous using TMDB discover with strict quality filters (2 pages)
          fetch(`/api/tmdb?path=/discover/tv&with_genres=16&with_original_language=ja&sort_by=vote_average.desc&vote_count.gte=1000&vote_average.gte=8&page=1`),
          fetch(`/api/tmdb?path=/discover/tv&with_genres=16&with_original_language=ja&sort_by=vote_average.desc&vote_count.gte=1000&vote_average.gte=8&page=2`),
          fetch(`/api/proxy?url=${encodeURIComponent("https://api.2embed.cc/trending?time_window=week&page=2")}`), // Gems (Movies Page 2)
          fetch(`/api/proxy?url=${encodeURIComponent("https://api.2embed.cc/trendingtv?time_window=week&page=2")}`) // Awards separate from main
        ]);

        const movies = (await movieRes.json()).results || [];
        const latestMov = (await movieLatestRes.json()).results || [];
        const tvShows = (await tvRes.json()).results || [];
        const latestTVShows = (await tvLatestRes.json()).results || [];

        // Process Peak Anime with Bayesian Weighted Rating
        const peakAnimeRaw = [
          ...((await animeRes.json()).results || []),
          ...((await animeRes2.json()).results || [])
        ];

        // Bayesian Rating: WR = (v/(v+m)) * R + (m/(v+m)) * C
        // m = minimum votes required (1000), C = mean vote across results
        const m = 1000;
        const C = peakAnimeRaw.length > 0
          ? peakAnimeRaw.reduce((sum, a) => sum + (a.vote_average || 0), 0) / peakAnimeRaw.length
          : 7;

        const peakAnime = peakAnimeRaw
          .map(anime => {
            const v = anime.vote_count || 0;
            const R = anime.vote_average || 0;
            const weightedRating = (v / (v + m)) * R + (m / (v + m)) * C;
            return { ...anime, weightedRating, media_type: 'tv' };
          })
          .sort((a, b) => b.weightedRating - a.weightedRating);

        const gemMovies = (await topRatedMovieRes.json()).results || [];
        const moreTV = (await topRatedTVRes.json()).results || [];

        setTrendingMovies(movies);
        setLatestMovies(latestMov);
        setTrendingTV(tvShows);
        setLatestTV(latestTVShows);

        setTrendingAnime(peakAnime);
        setLatestAnime(peakAnime);
        setGems(gemMovies);
        setAwardWinningTV(moreTV);
        // Reuse TV shows but shuffle or filter for 'Dark Dramas'
        setDarkDramas([...tvShows].reverse().slice(0, 10));

        // Set Hero Item (Randomly pick from Top 10 Movies Today)
        const top10 = movies.slice(0, 10);
        if (top10.length > 0) {
          const random = top10[Math.floor(Math.random() * top10.length)];
          setHeroItem(random);
          setHeroType("movie");
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Hero Rotation Logic — only cycles through Top 10 Movies Today
  useEffect(() => {
    if (trendingMovies.length === 0) return;

    const interval = setInterval(() => {
      const top10 = trendingMovies.slice(0, 10);
      if (top10.length > 0) {
        const random = top10[Math.floor(Math.random() * top10.length)];
        setHeroItem(random);
        setHeroType("movie");
      }
    }, 35000);

    return () => clearInterval(interval);
  }, [trendingMovies]);

  const { q, type: queryType } = router.query;
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Fuzzy search helpers
  // Generate alternative queries by inserting spaces at various positions
  const generateAlternatives = (query) => {
    const q = query.trim().toLowerCase();
    const alternatives = new Set([q]);

    // 1. Add spaces between concatenated words: "demonslayer" → "demon slayer"
    //    Try inserting a space at every position and check if BOTH parts are >= 2 chars
    for (let i = 2; i < q.length - 1; i++) {
      const left = q.slice(0, i);
      const right = q.slice(i);
      if (left.length >= 2 && right.length >= 2) {
        alternatives.add(`${left} ${right}`);
      }
    }

    // 2. Remove existing spaces: "demon slayer" → "demonslayer" (to match things like "DemonSlayer")
    if (q.includes(' ')) {
      alternatives.add(q.replace(/\s+/g, ''));
    }

    // 3. Common character substitutions
    const substitutions = [
      [/ph/g, 'f'], [/f/g, 'ph'],
      [/k/g, 'c'], [/c/g, 'k'],
      [/z/g, 's'], [/s/g, 'z'],
      [/y$/g, 'ie'], [/ie$/g, 'y'],
    ];
    for (const [pattern, replacement] of substitutions) {
      const alt = q.replace(pattern, replacement);
      if (alt !== q) alternatives.add(alt);
    }

    return [...alternatives].slice(0, 5); // Limit to 5 variations
  };

  // Levenshtein distance for ranking closeness
  const levenshtein = (a, b) => {
    const an = a.length, bn = b.length;
    if (an === 0) return bn;
    if (bn === 0) return an;
    const matrix = Array.from({ length: an + 1 }, (_, i) => {
      const row = new Array(bn + 1);
      row[0] = i;
      return row;
    });
    for (let j = 0; j <= bn; j++) matrix[0][j] = j;
    for (let i = 1; i <= an; i++) {
      for (let j = 1; j <= bn; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }
    return matrix[an][bn];
  };

  // Search Logic
  useEffect(() => {
    if (q) {
      setIsSearching(true);
      setLoading(true);

      const fetchGlobalSearch = async () => {
        try {
          const queryAlternatives = generateAlternatives(q);

          // Fetch from 2embed with original query + TMDB with all alternatives
          const embedPromises = [
            fetch(`/api/proxy?url=${encodeURIComponent(`https://api.2embed.cc/search?q=${encodeURIComponent(q)}&page=1`)}`),
            fetch(`/api/proxy?url=${encodeURIComponent(`https://api.2embed.cc/searchtv?q=${encodeURIComponent(q)}&page=1`)}`)
          ];

          // Search TMDB with each alternative query
          const tmdbPromises = queryAlternatives.map(alt =>
            fetch(`/api/tmdb?path=/search/multi&query=${encodeURIComponent(alt)}&page=1`)
          );

          const [movieRes, tvRes, ...tmdbResponses] = await Promise.all([...embedPromises, ...tmdbPromises]);

          const movieData = await movieRes.json();
          const tvData = await tvRes.json();

          // Merge all TMDB results from alternative queries
          const allTmdbResults = [];
          const seenTmdbIds = new Set();
          for (const res of tmdbResponses) {
            const data = await res.json();
            for (const item of (data.results || [])) {
              if ((item.media_type === 'movie' || item.media_type === 'tv') && !seenTmdbIds.has(item.id)) {
                seenTmdbIds.add(item.id);
                allTmdbResults.push(item);
              }
            }
          }

          const movies = (movieData.results || []).map(item => ({ ...item, media_type: 'movie' }));
          const shows = (tvData.results || []).map(item => ({ ...item, media_type: 'tv' }));

          // Build a popularity lookup from TMDB multi-search (most reliable popularity scores)
          const tmdbPopularity = new Map();
          for (const item of allTmdbResults) {
            tmdbPopularity.set(item.id, item.popularity || 0);
          }

          // Combine 2embed results and enrich with TMDB popularity
          const combined = [...movies, ...shows].map(item => {
            const id = item.tmdb_id || item.id;
            const tmdbPop = tmdbPopularity.get(id);
            return {
              ...item,
              popularity: tmdbPop !== undefined ? tmdbPop : (item.popularity || 0)
            };
          });

          // Also add any TMDB-only results not already in 2embed results
          const existingIds = new Set(combined.map(item => item.tmdb_id || item.id));
          for (const item of allTmdbResults) {
            if (!existingIds.has(item.id)) {
              combined.push({ ...item, tmdb_id: item.id });
              existingIds.add(item.id);
            }
          }

          // Sort primarily by popularity, with a small boost for exact/close title matches
          const normalizedQuery = q.toLowerCase().replace(/\s+/g, '');
          combined.forEach(item => {
            const title = (item.title || item.name || '').toLowerCase().replace(/\s+/g, '');
            // Exact substring match gets a small boost to bubble up the right result
            const exactBoost = title.includes(normalizedQuery) || normalizedQuery.includes(title) ? 50 : 0;
            // Primary sort is popularity, fuzzy match is just a tiebreaker
            item._searchScore = (item.popularity || 0) + exactBoost;
          });

          // Sort by popularity (with small exact-match boost)
          combined.sort((a, b) => (b._searchScore || 0) - (a._searchScore || 0));

          setSearchResults(combined);
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
    <div className="min-h-screen w-full bg-gradient-to-b from-gray-900 to-black md:bg-[#141414] md:bg-none text-white overflow-x-hidden font-netflix">
      <Navbar />

      {isSearching ? (
        <div className="pt-24 px-4 md:px-12 min-h-screen">
          <h2 className="text-2xl font-bold mb-6">Results for "{q}"</h2>
          <MediaGrid items={searchResults} type={queryType || "movie"} />
        </div>
      ) : (
        <>
          {/* Hero Section */}
          <HeroBanner item={heroItem} type={heroType} mobileItem={trendingMovies[0]} />

          {/* Content Rows */}
          <div className="relative z-10 -mt-10 md:-mt-2 pb-12 space-y-[2px] md:space-y-4">
            {/* 1. Popular Movies (Ranked) */}
            <MediaRow title="Top 10 Movies Today" items={trendingMovies.slice(0, 10)} type="movie" variant="top10" />

            {/* 2. Top 10 Shows Today - Numbered */}
            <MediaRow title="Top 10 Shows Today" items={trendingTV.slice(0, 10)} type="tv" variant="top10" />

            {/* 3. Gems for You (Movies) */}
            <MediaRow title="Gems for You" items={gems} type="movie" variant="landscape" />

            {/* 4. Bingeworthy TV Shows */}
            <MediaRow title="Bingeworthy TV Shows" items={trendingTV.slice(10, 20)} type="tv" variant="landscape" />

            {/* Continue Watching — collapses when empty, expands when items exist */}
            <MediaRow title="Continue Watching" items={continueWatching} type="mixed" variant="landscape" />

            {/* 5. Award-Winning TV Shows */}
            <MediaRow title="Award-Winning TV Shows" items={awardWinningTV} type="tv" variant="landscape" />

            {/* 6. Dark TV Dramas */}
            <MediaRow title="Dark TV Dramas" items={darkDramas} type="tv" variant="landscape" />

            {/* 8. New Releases (Mix/Movies) */}
            <MediaRow title="New Releases" items={latestMovies} type="movie" variant="landscape" />

            {/* 7. Peak Anime - Moved to end */}
            <MediaRow
              title="Peak Anime"
              items={trendingAnime.length > 0 ? trendingAnime : (latestAnime.length > 0 ? latestAnime : latestMovies)}
              type="anime"
              variant="landscape"
            />

            {/* 9. Top 10 Movies in Region — Mobile: numbered, Desktop: landscape banners */}
            <div className="md:hidden">
              <MediaRow title={`Top 10 Movies in ${userRegion.name} Today`} items={regionTop10} type="movie" variant="top10mobile" />
            </div>
            <div className="hidden md:block">
              <MediaRow title={`Top 10 Movies in ${userRegion.name} Today`} items={regionTop10} type="movie" variant="landscape" />
            </div>

            {/* 10. Award-Winning TV Dramas — Mobile: showcase, Desktop: landscape banners */}
            <div className="md:hidden">
              <MediaRow title="Award-Winning TV Dramas" items={awardDramas} type="tv" variant="showcase" />
            </div>
            <div className="hidden md:block">
              <MediaRow title="Award-Winning TV Dramas" items={awardDramas} type="tv" variant="landscape" />
            </div>

            {/* 11. Bingeworthy TV Sci-Fi & Fantasy */}
            <MediaRow title="Bingeworthy TV Sci-Fi & Fantasy" items={sciFiFantasy} type="tv" variant="landscape" />

            {/* 12. US Criminal Investigation TV Shows */}
            <MediaRow title="US Criminal Investigation TV Shows" items={crimeShows} type="tv" variant="landscape" />
          </div>
        </>
      )}

      <Footer />
    </div>
  );
}
