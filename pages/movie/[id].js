import { useRouter } from "next/router";
import Player from "../../components/Player";

export default function MovieDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  // Assuming 'id' from route /movie/[id] is mainly the IMDB ID (tt...) or TMDB ID.
  // The Player component usually handles the embedding based on these.
  // We pass 'id' as 'imdb_id' if it starts with 'tt', otherwise 'tmdb_id'.
  const isImdb = id && id.startsWith("tt");

  return (
    <div className="fixed inset-0 bg-black text-white flex items-center justify-center z-50 p-[5px]">
      {/* Full Screen Player Container */}
      <div className="w-full h-full">
        <Player
          imdb_id={isImdb ? id : null}
          tmdb_id={!isImdb ? id : null}
          type="movie"
        />
      </div>
    </div>
  );
} 
