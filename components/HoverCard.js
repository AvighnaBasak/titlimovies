import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";

import { useModal } from "../context/ModalContext";
import { useTransition } from "../context/TransitionContext";

export default function HoverCard({ item, type, imageSrc }) {
    const router = useRouter();
    const { openModal } = useModal();
    const { navigateDelay } = useTransition();
    const [isHovered, setIsHovered] = useState(false);
    const [position, setPosition] = useState(null);
    const [isVisible, setIsVisible] = useState(false); // For animation transition
    const triggerRef = useRef(null);
    const timeoutRef = useRef(null);
    const closeTimeoutRef = useRef(null);

    const title = item.title || item.name || item.title_en || "Untitled";
    const year = (item.release_date || item.first_air_date || "2024").split("-")[0];
    const match = Math.floor(Math.random() * 30 + 70) + "% Match";

    // Construct Watch URL
    let watchUrl = "/";
    if (type === "movie") watchUrl = `/movie/${item.imdb_id || item.id}`;
    else if (type === "tv") watchUrl = `/tv/${item.imdb_id || item.id}`;
    else if (type === "anime") watchUrl = `/anime/${encodeURIComponent(title)}`;

    const handlePlay = (e) => {
        e.stopPropagation(); // Prevent bubbling
        navigateDelay(watchUrl);
    };

    const handleMouseEnter = () => {
        if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
        if (isHovered) return;

        timeoutRef.current = setTimeout(() => {
            if (triggerRef.current) {
                const rect = triggerRef.current.getBoundingClientRect();
                const width = rect.width;
                const height = rect.height;

                // Fixed "Box" Dimensions (Landscape standard)
                // Regardless of trigger shape (portrait/landscape), we expand to this size
                const TARGET_WIDTH = 340;
                // Aspect Ratio 16:9 for media area + info space
                const TARGET_MEDIA_HEIGHT = TARGET_WIDTH * (9 / 16);
                const INFO_HEIGHT = 160; // Space for buttons, tags, etc
                const TARGET_HEIGHT = TARGET_MEDIA_HEIGHT + INFO_HEIGHT;

                let left = rect.left - (TARGET_WIDTH - width) / 2;
                let top = rect.top - (TARGET_HEIGHT - height) / 2; // Center vertically over trigger center

                // Ensure onscreen (basic check)
                if (left < 10) left = 10;

                // Absolute positioning: needs scrollY included
                const finalTop = top + window.scrollY;

                setPosition({
                    top: finalTop,
                    left: left,
                    width: TARGET_WIDTH,
                    height: TARGET_HEIGHT
                });

                setIsHovered(true);
            }
        }, 400);
    };

    const handleMouseLeave = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        // Delay closing logic
        closeTimeoutRef.current = setTimeout(() => {
            // Note: Exit animation is tricky with just CSS unmount. 
            // We'll just unmount for now to be snappy or rely on standard exit if needed.
            // For now, simplicity: just close.
            setIsHovered(false);
            setPosition(null);
        }, 300);
    };

    const handlePortalMouseEnter = () => {
        if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };

    // Portal Content
    const HoverContent = () => {
        if (!position || typeof document === 'undefined') return null;

        return createPortal(
            <div
                className="absolute z-[99999] rounded-lg bg-[#181818] overflow-hidden origin-center border border-white/10 animate-scaleIn"
                style={{
                    top: position.top,
                    left: position.left,
                    width: position.width,
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.95)'
                }}
                onMouseEnter={handlePortalMouseEnter}
                onMouseLeave={handleMouseLeave}
                onClick={(e) => { e.stopPropagation(); navigateDelay(watchUrl); }}
            >
                {/* Media Top Half */}
                <div className="relative w-full aspect-video bg-black">
                    <Image
                        src={imageSrc}
                        alt={title}
                        fill
                        className="object-cover"
                    />
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-transparent to-transparent opacity-90"></div>
                </div>

                {/* Info Bottom Half */}
                <div className="p-4 bg-[#181818] flex flex-col gap-3 -mt-2 relative z-10">
                    {/* Actions */}
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={handlePlay}
                            className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:bg-gray-200 transition scale-100 hover:scale-110 active:scale-95 cursor-pointer shadow-lg"
                        >
                            <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                        </button>
                        <button className="w-10 h-10 rounded-full border-2 border-gray-500 text-white flex items-center justify-center hover:border-white hover:bg-white/10 transition scale-100 hover:scale-110 cursor-pointer">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                        </button>
                        <button className="w-10 h-10 rounded-full border-2 border-gray-500 text-white flex items-center justify-center hover:border-white hover:bg-white/10 transition scale-100 hover:scale-110 cursor-pointer">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" /></svg>
                        </button>
                        <div className="flex-grow"></div>
                        <button
                            className="w-10 h-10 rounded-full border-2 border-gray-500 text-white flex items-center justify-center hover:border-white hover:bg-white/10 transition scale-100 hover:scale-110 cursor-pointer"
                            onClick={(e) => {
                                e.stopPropagation();
                                openModal(item, type);
                            }}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                        </button>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-3 text-sm font-semibold flex-wrap">
                        <span className="text-[#46d369]">{match}</span>
                        <span className="border border-gray-500 px-1 rounded-[2px] text-gray-400 text-xs py-0.5">13+</span>
                        <span className="text-gray-400">{year}</span>
                        <span className="border border-white/40 px-1.5 rounded-[3px] text-[9px] text-white py-0.5">HD</span>
                    </div>

                    {/* Genres */}
                    <div className="flex gap-2 text-xs text-white/90">
                        <span>Witty</span>
                        <span className="text-gray-500">•</span>
                        <span>Exciting</span>
                        <span className="text-gray-500">•</span>
                        <span>Drama</span>
                    </div>
                </div>
            </div>,
            document.body
        );
    };

    return (
        <>
            <div
                ref={triggerRef}
                className="absolute inset-0 w-full h-full z-10 opacity-0 cursor-pointer"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            />
            {isHovered && <HoverContent />}
        </>
    );
}
