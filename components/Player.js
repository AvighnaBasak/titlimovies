import { useState } from "react";

export default function Player({ imdb_id, tmdb_id, type, season, episode, title, number }) {
  const [selectedServer, setSelectedServer] = useState("server1");

  const getServerUrl = (server) => {
    if (type === "movie") {
      switch (server) {
        case "server1":
          return imdb_id ? `https://www.2embed.cc/embed/${imdb_id}` : tmdb_id ? `https://www.2embed.cc/embed/${tmdb_id}` : "";
        case "server2":
          return imdb_id ? `https://vidsrc.to/embed/movie/${imdb_id}` : tmdb_id ? `https://vidsrc.to/embed/movie/${tmdb_id}` : "";
        case "server3":
          return imdb_id ? `https://multiembed.mov/?video_id=${imdb_id}` : tmdb_id ? `https://multiembed.mov/?video_id=${tmdb_id}` : "";
        default:
          return "";
      }
    } else if (type === "tv") {
      switch (server) {
        case "server1":
          if (imdb_id && season && episode) return `https://www.2embed.cc/embedtv/${imdb_id}&s=${season}&e=${episode}`;
          else if (tmdb_id && season && episode) return `https://www.2embed.cc/embedtv/${tmdb_id}&s=${season}&e=${episode}`;
          else return "";
        case "server2":
          if (imdb_id && season && episode) return `https://vidsrc.to/embed/tv/${imdb_id}/${season}/${episode}`;
          else if (tmdb_id && season && episode) return `https://vidsrc.to/embed/tv/${tmdb_id}/${season}/${episode}`;
          else return "";
        case "server3":
          if (imdb_id && season && episode) return `https://multiembed.mov/directstream.php?video_id=${imdb_id}&s=${season}&e=${episode}`;
          else if (tmdb_id && season && episode) return `https://multiembed.mov/directstream.php?video_id=${tmdb_id}&s=${season}&e=${episode}`;
          else return "";
        default:
          return "";
      }
    } else if (type === "anime") {
      switch (server) {
        case "server1":
          return title && number ? `https://2anime.xyz/embed/${title}-episode-${number}` : "";
        case "server2":
          return title && number ? `https://gogoanime.lu/embed/${title}-episode-${number}` : "";
        case "server3":
          return title && number ? `https://aniwatch.to/embed/${title}-episode-${number}` : "";
        default:
          return "";
      }
    }
    return "";
  };

  const src = getServerUrl(selectedServer);
  const servers = [
    { id: "server1", name: "Server 1", description: "2embed" },
    { id: "server2", name: "Server 2", description: "VidSrc" },
    { id: "server3", name: "Server 3", description: "MultiEmbed" }
  ];

  if (!src) return <div className="text-gray-400">No player available.</div>;

  return (
    <div className="w-full">
      {/* Server Selection */}
      <div className="mb-4 flex gap-2 flex-wrap justify-center">
        {servers.map((server) => (
          <button
            key={server.id}
            onClick={() => setSelectedServer(server.id)}
            className={`px-3 py-2 md:px-4 md:py-2 rounded-2xl font-medium transition-all text-sm md:text-base ${
              selectedServer === server.id
                ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                : "bg-gray-800/80 text-gray-300 hover:bg-gray-700/80 hover:text-white"
            }`}
          >
            <span className="block">{server.name}</span>
            <span className="text-xs block opacity-75">{server.description}</span>
          </button>
        ))}
      </div>

      {/* Player */}
      <div className="aspect-w-16 aspect-h-9 w-full rounded-3xl overflow-hidden bg-black shadow-lg">
        <iframe
          src={src}
          width="100%"
          height="100%"
          frameBorder="0"
          scrolling="no"
          allowFullScreen
          referrerPolicy="no-referrer"
          sandbox="allow-same-origin allow-scripts allow-presentation"
          className="w-full h-64 sm:h-80 md:h-96 min-h-[250px]"
          title="Player"
        ></iframe>
      </div>
    </div>
  );
} 
