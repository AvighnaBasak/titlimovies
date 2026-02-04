
import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/router";
import Image from "next/image";
import { useModal } from "../context/ModalContext";
import { useTransition } from "../context/TransitionContext";

const API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;

export default function InfoModal() {
    const { isModalOpen, modalContent, closeModal } = useModal();
    const router = useRouter();
    const { navigateDelay } = useTransition();
    const [details, setDetails] = useState(null);
    const [loading, setLoading] = useState(false);
    const [videoKey, setVideoKey] = useState(null);
    const [logoPath, setLogoPath] = useState(null);
    const [selectedSeason, setSelectedSeason] = useState(1);
    const [seasonEpisodes, setSeasonEpisodes] = useState([]);
    const [isMuted, setIsMuted] = useState(true);

    // Close on Escape
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape") closeModal();
        };
        if (isModalOpen) window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isModalOpen, closeModal]);

    // Main Fetch Logic
    useEffect(() => {
        if (!isModalOpen || !modalContent) {
            setDetails(null);
            setVideoKey(null);
            setLogoPath(null);
            setSeasonEpisodes([]);
            setSelectedSeason(1);
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            const { id, type } = modalContent;
            // Convert to TMDB type
            const mediaType = type === 'anime' ? 'tv' : (type || 'movie');

            try {
                // Fetch Main Details with Append To Response
                const append = "credits,release_dates,content_ratings,recommendations,keywords,similar,videos,images";
                const url = `https://api.themoviedb.org/3/${mediaType}/${id}?api_key=${API_KEY}&append_to_response=${append}`;
                const res = await fetch(url);
                const data = await res.json();

                // Process Data (Netflix Style Mapping)

                // 1. Runtime
                let runtime = 0;
                if (data.runtime) runtime = data.runtime;
                else if (data.episode_run_time && data.episode_run_time.length > 0) runtime = data.episode_run_time[0];

                const hours = Math.floor(runtime / 60);
                const minutes = runtime % 60;
                const formattedRuntime = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

                // 2. Rating (Maturity)
                let rating = "NR";
                if (mediaType === 'movie' && data.release_dates) {
                    const country = data.release_dates.results.find(c => c.iso_3166_1 === 'IN') ||
                        data.release_dates.results.find(c => c.iso_3166_1 === 'US');
                    if (country && country.release_dates.length > 0) {
                        rating = country.release_dates[country.release_dates.length - 1].certification || "NR";
                    }
                } else if (mediaType === 'tv' && data.content_ratings) {
                    const country = data.content_ratings.results.find(c => c.iso_3166_1 === 'IN') ||
                        data.content_ratings.results.find(c => c.iso_3166_1 === 'US');
                    if (country) rating = country.rating;
                }

                // 3. Crew & Cast
                const directors = data.credits?.crew?.filter(m => m.job === 'Director').map(m => m.name) || [];
                const writers = data.credits?.crew?.filter(m => ['Writer', 'Screenplay', 'Creator'].includes(m.job)).map(m => m.name) || [];
                // For TV, creators are often in `created_by`
                if (mediaType === 'tv' && data.created_by) {
                    directors.push(...data.created_by.map(c => c.name));
                }

                const cast = data.credits?.cast?.slice(0, 10).map(c => c.name) || [];

                // 4. Video (Trailer)
                const videos = data.videos?.results || [];
                const trailer = videos.find(v => v.type === "Trailer" && v.site === "YouTube") || videos.find(v => v.site === "YouTube");
                setVideoKey(trailer ? trailer.key : null);

                // 5. Logo
                const logos = data.images?.logos || [];
                const logo = logos.find(l => l.iso_639_1 === 'en') || logos[0];
                setLogoPath(logo ? logo.file_path : null);

                // 6. Episodes (Pre-fetch Season 1 if TV)
                if (mediaType === 'tv') {
                    // We will fetch season 1 specifically later in effect, or here? 
                    // Let's rely on the separate effect for season changes to handle loading episodes.
                    // Ensuring we have seasons
                }

                const netflixData = {
                    ...data,
                    formattedRuntime,
                    maturityRating: rating,
                    genresList: data.genres?.map(g => g.name) || [],
                    tags: data.keywords?.keywords?.map(k => k.name) || data.keywords?.results?.map(k => k.name) || [],
                    directorsList: [...new Set(directors)],
                    writersList: [...new Set(writers)],
                    castList: cast,
                    moreLikeThis: data.recommendations?.results?.slice(0, 12) || data.similar?.results?.slice(0, 12) || []
                };

                setDetails(netflixData);
            } catch (err) {
                console.error("Failed to fetch details", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [isModalOpen, modalContent]);

    // Fetch Season Episodes when Season Changes (TV Only)
    useEffect(() => {
        if (!details || (modalContent?.type !== 'tv' && modalContent?.type !== 'anime') || !details.seasons) return;

        const fetchSeason = async () => {
            // Find the season object to get accurate season number or just use selectedSeason
            // Some shows have season 0 (Specials).
            try {
                const res = await fetch(`https://api.themoviedb.org/3/tv/${details.id}/season/${selectedSeason}?api_key=${API_KEY}`);
                const data = await res.json();
                setSeasonEpisodes(data.episodes || []);
            } catch (e) {
                console.error("Failed to fetch season", e);
            }
        };

        fetchSeason();
    }, [selectedSeason, details, modalContent]);

    const handlePlay = () => {
        if (!details) return;
        // Route to player
        const target = modalContent.type === 'tv' || modalContent.type === 'anime' ? `/tv/${details.id}` : `/movie/${details.id}`;
        navigateDelay(target);
        setTimeout(() => closeModal(), 1000);
    };

    const handleEpisodePlay = (epNum) => {
        // We need to pass season and episode to the player page.
        // NOTE: This assumes updated TV page logic.
        navigateDelay(`/tv/${details.id}?season=${selectedSeason}&episode=${epNum}`);
        setTimeout(() => closeModal(), 1000);
    };

    if (!isModalOpen) return null;
    if (typeof document === 'undefined') return null;

    return createPortal(
        <div className="fixed inset-0 z-[1000] overflow-y-auto overflow-x-hidden bg-black/70 backdrop-blur-sm flex justify-center items-start pt-8 pb-8 animate-fadeIn" onClick={closeModal}>
            <div
                className="relative w-full max-w-[850px] bg-[#181818] rounded-xl overflow-hidden shadow-2xl origin-top animate-scaleIn mx-0 md:mx-4 mb-0 md:mb-8 pb-12 md:pb-0"
                onClick={e => e.stopPropagation()}
                style={{ minHeight: '80vh' }}
            >
                {/* Close Button */}
                <button
                    onClick={closeModal}
                    className="absolute top-4 right-4 z-50 w-8 h-8 md:w-9 md:h-9 rounded-full bg-[#181818] text-white flex items-center justify-center hover:bg-[#333] transition cursor-pointer"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>

                {loading || !details ? (
                    <div className="h-[50vh] flex items-center justify-center text-white">Loading...</div>
                ) : (
                    <>
                        {/* Header Video Area */}
                        <div className="relative w-full aspect-video bg-black group overflow-hidden">
                            {videoKey ? (
                                <iframe
                                    className="w-full h-full object-cover pointer-events-none transform scale-[1.50] origin-center"
                                    src={`https://www.youtube.com/embed/${videoKey}?autoplay=1&mute=${isMuted ? 1 : 0}&controls=0&loop=1&playlist=${videoKey}&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1`}
                                    allow="autoplay; encrypted-media"
                                />
                            ) : (
                                <div className="relative w-full h-full">
                                    <Image
                                        src={`https://image.tmdb.org/t/p/original${details.backdrop_path || details.poster_path}`}
                                        alt={details.title || details.name}
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                            )}

                            {/* Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-transparent to-transparent z-10"></div>
                            {/* Explicit Bottom Fade for darker transition */}
                            <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-[#181818] via-[#181818]/60 to-transparent z-10"></div>

                            {/* Content Overlay */}
                            <div className="absolute bottom-[5%] left-[5%] right-[5%] z-20">
                                <div className="max-w-[70%] md:max-w-[50%]">
                                    {logoPath ? (
                                        <img
                                            src={`https://image.tmdb.org/t/p/w500${logoPath}`}
                                            alt="Logo"
                                            className="w-full max-h-20 md:max-h-32 object-contain object-left-bottom mb-4 md:mb-6"
                                        />
                                    ) : (
                                        <h1 className="text-2xl md:text-4xl font-bold text-white mb-4 drop-shadow-md">{details.title || details.name}</h1>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 md:gap-3">
                                    <button
                                        onClick={handlePlay}
                                        className="bg-white text-black px-4 md:px-6 py-1.5 md:py-2 rounded font-bold flex items-center gap-2 hover:bg-gray-200 transition text-sm md:text-base"
                                    >
                                        <svg className="w-5 h-5 md:w-6 md:h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                        Play
                                    </button>
                                    <button className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-gray-500 text-white flex items-center justify-center hover:border-white hover:bg-white/10 transition">
                                        <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                                    </button>
                                    <button className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-gray-500 text-white flex items-center justify-center hover:border-white hover:bg-white/10 transition">
                                        <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" /></svg>
                                    </button>
                                    <div className="flex-grow"></div>
                                    {videoKey && (
                                        <button
                                            onClick={() => setIsMuted(!isMuted)}
                                            className="w-8 h-8 md:w-10 md:h-10 rounded-full border border-white/30 text-white/70 flex items-center justify-center hover:border-white hover:text-white hover:bg-white/10 transition"
                                        >
                                            {isMuted ? (
                                                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
                                            ) : (
                                                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Main Info */}
                        <div className="px-4 md:px-10 py-4 grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4 md:gap-8">
                            {/* Left Column */}
                            <div className="space-y-3 md:space-y-4">
                                <div className="flex items-center flex-wrap gap-2 md:gap-3 text-white font-semibold text-sm md:text-base">
                                    <span className="text-[#46d369]">{(details.vote_average * 10).toFixed(0)}% Match</span>
                                    <span className="text-gray-400">{(details.release_date || details.first_air_date || "").substring(0, 4)}</span>
                                    <span className="border border-white/40 px-1 rounded text-xs py-0.5">{details.maturityRating}</span>
                                    <span className="text-gray-400">{details.formattedRuntime}</span>
                                    <span className="border border-white/40 px-1 rounded text-[10px] py-0.5">HD</span>
                                </div>

                                <p className="text-white text-sm md:text-base leading-relaxed">
                                    {details.overview}
                                </p>
                            </div>

                            {/* Right Column (Metadata) */}
                            <div className="text-xs md:text-sm space-y-2 md:space-y-3">
                                <div className="text-gray-400">
                                    <span className="text-gray-500">Cast: </span>
                                    {details.castList.map((c, i) => (
                                        <span key={i} className="text-white hover:underline cursor-pointer mr-1">{c}{i < details.castList.length - 1 ? ',' : ''}</span>
                                    ))}
                                </div>
                                <div className="text-gray-400">
                                    <span className="text-gray-500">Genres: </span>
                                    {details.genresList.map((g, i) => (
                                        <span key={i} className="text-white hover:underline cursor-pointer mr-1">{g}{i < details.genresList.length - 1 ? ',' : ''}</span>
                                    ))}
                                </div>
                                <div className="text-gray-400">
                                    <span className="text-gray-500">This is: </span>
                                    {details.tags.slice(0, 5).map((t, i) => (
                                        <span key={i} className="text-white mr-1">{t}{i < 4 ? ',' : ''}</span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Episodes Section (TV Only) */}
                        {(modalContent.type === 'tv' || modalContent.type === 'anime') && details.seasons && (
                            <div className="px-4 md:px-10 py-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg md:text-xl font-bold text-white">Episodes</h3>
                                    <div className="relative">
                                        <select
                                            value={selectedSeason}
                                            onChange={(e) => setSelectedSeason(Number(e.target.value))}
                                            className="appearance-none bg-[#242424] border border-gray-600 rounded py-1 md:py-2 px-3 md:px-4 pr-8 md:pr-10 text-white font-bold cursor-pointer focus:outline-none focus:border-white text-sm md:text-base"
                                        >
                                            {details.seasons.filter(s => s.season_number > 0).map(s => (
                                                <option key={s.id} value={s.season_number}>{s.name} ({s.episode_count} Episodes)</option>
                                            ))}
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-white">
                                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {seasonEpisodes.map((ep, idx) => (
                                        <div
                                            key={ep.id}
                                            className="group flex flex-col md:flex-row items-start md:items-center gap-4 p-4 rounded-md hover:bg-[#333] cursor-pointer transition border border-transparent hover:border-white/10"
                                            onClick={() => handleEpisodePlay(ep.episode_number)}
                                        >
                                            <div className="flex items-center gap-4 w-full md:w-auto">
                                                <div className="text-xl md:text-2xl text-gray-400 font-bold w-6">{ep.episode_number}</div>
                                                <div className="relative w-full md:w-[140px] aspect-video bg-gray-800 rounded overflow-hidden flex-shrink-0">
                                                    {ep.still_path ? (
                                                        <Image src={`https://image.tmdb.org/t/p/w300${ep.still_path}`} alt={ep.name} fill className="object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">No Image</div>
                                                    )}
                                                    {/* Play Overlay */}
                                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                                                        <div className="w-8 h-8 md:w-10 md:h-10 bg-white/90 rounded-full flex items-center justify-center pl-1">
                                                            <svg className="w-4 h-4 md:w-5 md:h-5 text-black" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex-grow w-full md:w-auto">
                                                <div className="flex justify-between text-white font-bold mb-1 text-sm md:text-base">
                                                    <span>{ep.name}</span>
                                                    <span className="text-sm font-normal text-gray-400">{ep.runtime ? `${ep.runtime}m` : ''}</span>
                                                </div>
                                                <p className="text-gray-400 text-xs md:text-sm line-clamp-2 leading-snug">{ep.overview}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* More Like This (Using Grid) */}
                        <div className="px-4 md:px-10 py-6">
                            <h3 className="text-lg md:text-xl font-bold text-white mb-4">More Like This</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                                {details.moreLikeThis.map((item) => (
                                    <div key={item.id} className="bg-[#2f2f2f] rounded-md overflow-hidden cursor-pointer hover:bg-[#404040] transition" onClick={() => {
                                        // TODO: handle switching modal content
                                    }}>
                                        <div className="relative aspect-video w-full bg-gray-800">
                                            {item.backdrop_path || item.poster_path ? (
                                                <Image src={`https://image.tmdb.org/t/p/w500${item.backdrop_path || item.poster_path}`} alt={item.title} fill className="object-cover" />
                                            ) : null}
                                            <div className="absolute top-2 right-2 font-bold text-white drop-shadow-md text-xs md:text-sm">
                                                {(item.vote_average * 10).toFixed(0)}% Match
                                            </div>
                                        </div>
                                        <div className="p-3 md:p-4">
                                            <div className="flex justify-between items-start text-white gap-2 mb-2">
                                                <h4 className="font-bold text-xs md:text-sm leading-tight">{item.title || item.name}</h4>
                                                <span className="text-[10px] md:text-xs text-gray-400 text-nowrap">{(item.release_date || item.first_air_date || "").substring(0, 4)}</span>
                                            </div>
                                            <p className="text-[10px] md:text-xs text-gray-400 line-clamp-3 leading-relaxed">{item.overview}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* About Section */}
                        <div className="px-4 md:px-10 py-8 pb-12">
                            <h3 className="text-lg md:text-xl font-bold text-white mb-2">About <strong>{details.title || details.name}</strong></h3>
                            <div className="text-xs md:text-sm text-gray-400 space-y-1">
                                <p><span className="text-gray-500">Director: </span>{details.directorsList.join(', ')}</p>
                                <p><span className="text-gray-500">Cast: </span>{details.castList.join(', ')}</p>
                                <p><span className="text-gray-500">Writer: </span>{details.writersList.join(', ')}</p>
                                <p><span className="text-gray-500">Genres: </span>{details.genresList.join(', ')}</p>
                                <p><span className="text-gray-500">Maturity Rating: </span><span className="border border-white/40 px-1 text-xs text-white ml-2">{details.maturityRating}</span></p>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>,
        document.body
    );
}
