
import { useRef } from "react";
import MediaCard from "./MediaCard";

export default function MediaRow({ title, items, type, variant = "landscape" }) {
    const rowRef = useRef(null);

    const scroll = (direction) => {
        if (rowRef.current) {
            const { scrollLeft, clientWidth } = rowRef.current;
            const scrollTo = direction === "left"
                ? scrollLeft - clientWidth / 2
                : scrollLeft + clientWidth / 2;

            rowRef.current.scrollTo({ left: scrollTo, behavior: "smooth" });
        }
    };

    if (!items || items.length === 0) return null;

    return (
        <div className="space-y-1 md:space-y-2 my-2 pl-2 md:pl-12 group relative">
            <h2 className="text-lg md:text-2xl font-semibold text-white/90 hover:text-white transition duration-200 cursor-pointer">
                {title}
            </h2>

            <div className="relative">
                {/* Left Arrow (Hidden on Mobile) */}
                <div
                    className="absolute top-0 bottom-0 left-0 z-40 bg-black/50 w-8 md:w-12 hidden md:group-hover:flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 hover:bg-black/70 transition-all duration-300"
                    onClick={() => scroll("left")}
                >
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </div>

                {/* Scroll Container */}
                <div
                    ref={rowRef}
                    className={`flex items-center ${variant === 'top10' ? 'gap-2' : 'gap-2 md:gap-4'} overflow-x-scroll overflow-y-hidden no-scrollbar scroll-smooth pb-4 md:pb-8 px-2 md:px-4`}
                >
                    {items.map((item, idx) => (
                        <div
                            key={item.id || item.imdb_id || idx}
                            className={`flex-shrink-0 ${variant === 'top10' ? 'min-w-[130px] md:min-w-max' : 'min-w-[110px] md:min-w-[216px]'}`}
                        >
                            <MediaCard
                                item={item}
                                type={type}
                                variant={variant}
                                rank={idx + 1}
                            />
                        </div>
                    ))}
                </div>

                {/* Right Arrow (Hidden on Mobile) */}
                <div
                    className="absolute top-0 bottom-0 right-0 z-40 bg-black/50 w-8 md:w-12 hidden md:group-hover:flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 hover:bg-black/70 transition-all duration-300"
                    onClick={() => scroll("right")}
                >
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </div>
            </div>
        </div>
    );
}
