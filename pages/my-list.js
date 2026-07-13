import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "../components/Navbar";
import MediaGrid from "../components/MediaGrid";
import Footer from "../components/Footer";
import { getMyList, MY_LIST_EVENT } from "../lib/myList";

export default function MyListPage() {
  const [list, setList] = useState(null); // null = not yet loaded

  useEffect(() => {
    const load = () => setList(getMyList());
    load();
    window.addEventListener(MY_LIST_EVENT, load);
    return () => window.removeEventListener(MY_LIST_EVENT, load);
  }, []);

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-gray-900 to-black md:bg-[#141414] md:bg-none text-white overflow-x-hidden font-netflix">
      <Navbar />
      <div className="pt-24 md:pt-28 px-4 md:px-12 min-h-[70vh]">
        <h1 className="text-2xl md:text-4xl font-bold mb-6">My List</h1>

        {list === null ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : list.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">➕</div>
            <h3 className="text-xl font-semibold text-gray-200 mb-2">Your list is empty</h3>
            <p className="text-gray-400 mb-6">Add movies and shows to watch them later.</p>
            <Link href="/" className="inline-block bg-white text-black font-semibold px-6 py-2 rounded hover:bg-gray-200 transition">
              Browse titles
            </Link>
          </div>
        ) : (
          <MediaGrid items={list} type="movie" />
        )}
      </div>
      <Footer />
    </div>
  );
}
