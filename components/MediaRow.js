
import { useRef, useState, useEffect, memo } from "react";
import { motion } from "framer-motion";
import MediaCard from "./MediaCard";

// Spring config matching Netflix's "luxury weight"
const NETFLIX_SPRING = { type: "spring", stiffness: 260, damping: 30 };

// Row entrance variants — slide + fade (desktop only)
const rowVariants = {
    hidden: { opacity: 0, x: 30 },
    visible: {
        opacity: 1,
        x: 0,
        transition: {
            ...NETFLIX_SPRING,
            staggerChildren: 0.04,
        }
    }
};

// Individual card entrance within a row (desktop only)
const cardVariants = {
    hidden: { opacity: 0, scale: 0.92, y: 8 },
    visible: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: NETFLIX_SPRING
    }
};

// Memoized card wrapper — prevents re-renders when parent row re-renders
const MemoMediaCard = memo(function MemoMediaCard({ item, type, variant, rank }) {
    return (
        <MediaCard
            item={item}
            type={type}
            variant={variant}
            rank={rank}
        />
    );
});

export default function MediaRow({ title, items, type, variant = "landscape" }) {
    const rowRef = useRef(null);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const scroll = (direction) => {
        if (rowRef.current) {
            const { scrollLeft, clientWidth } = rowRef.current;
            const scrollTo = direction === "left"
                ? scrollLeft - clientWidth / 2
                : scrollLeft + clientWidth / 2;

            rowRef.current.scrollTo({ left: scrollTo, behavior: "smooth" });
        }
    };

    // If empty, render a collapsed invisible container (keeps component mounted)
    if (!items || items.length === 0) {
        return <div style={{ width: '1px', height: '0px', overflow: 'hidden' }} />;
    }

    /*
     * MOBILE PERFORMANCE:
     * - Skip Framer Motion whileInView / stagger animations entirely on mobile.
     *   Spring physics in JS are too expensive on real mobile hardware (iPhone Safari).
     * - Use plain divs with CSS containment + GPU layer promotion instead.
     * - Desktop keeps the rich entrance animations.
     */
    if (isMobile) {
        return (
            <div className="space-y-0 my-0 pl-2 group relative mobile-row-contain">
                <h2 className="text-base font-medium text-white/90 pl-2 mb-[6px]">
                    {title}
                </h2>
                <div className="relative">
                    <div
                        ref={rowRef}
                        className={`flex items-center ${(variant === 'top10' || variant === 'top10mobile') ? 'gap-2' : variant === 'showcase' ? 'gap-3' : 'gap-2'} overflow-x-scroll overflow-y-hidden no-scrollbar scroll-smooth pb-2 px-2 mobile-scroll-row`}
                    >
                        {items.map((item, idx) => (
                            <div key={item.id || item.imdb_id || idx} className="mobile-card-layer">
                                <MemoMediaCard
                                    item={item}
                                    type={type}
                                    variant={variant}
                                    rank={idx + 1}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // DESKTOP: Full Framer Motion animations
    return (
        <motion.div
            className="space-y-0 md:space-y-2 my-0 md:my-2 pl-2 md:pl-12 group relative"
            variants={rowVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
        >
            <h2 className="text-base md:text-2xl font-medium md:font-bold text-white/90 hover:text-white transition duration-200 cursor-pointer pl-2 md:pl-4 mb-[6px] md:mb-0">
                {title}
            </h2>

            <div className="relative">
                {/* Left Arrow */}
                <div
                    className="absolute top-0 bottom-0 left-0 z-40 bg-black/50 w-8 md:w-12 hidden md:group-hover:flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 hover:bg-black/70 transition-all duration-300"
                    onClick={() => scroll("left")}
                >
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </div>

                {/* Scroll Container */}
                <div
                    ref={rowRef}
                    className={`flex items-center ${(variant === 'top10' || variant === 'top10mobile') ? 'gap-2' : variant === 'showcase' ? 'gap-3' : 'gap-2 md:gap-2'} overflow-x-scroll overflow-y-hidden no-scrollbar scroll-smooth pb-2 md:pb-8 px-2 md:px-4`}
                >
                    {items.map((item, idx) => (
                        <motion.div key={item.id || item.imdb_id || idx} variants={cardVariants}>
                            <MemoMediaCard
                                item={item}
                                type={type}
                                variant={variant}
                                rank={idx + 1}
                            />
                        </motion.div>
                    ))}
                </div>

                {/* Right Arrow */}
                <div
                    className="absolute top-0 bottom-0 right-0 z-40 bg-black/50 w-8 md:w-12 hidden md:group-hover:flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 hover:bg-black/70 transition-all duration-300"
                    onClick={() => scroll("right")}
                >
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </div>
            </div>
        </motion.div>
    );
}
