
import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/router';

const TransitionContext = createContext();

export function TransitionProvider({ children }) {
    const router = useRouter();
    const [isPageLoading, setIsPageLoading] = useState(true); // Initial load
    const [isTransitioning, setIsTransitioning] = useState(false); // Navigation transition
    const [opacity, setOpacity] = useState(0); // Content opacity

    // Initial fake load
    useEffect(() => {
        // Start with opacity 0 (invisible content)
        setOpacity(0);

        // Fake 1s loading time
        const timer = setTimeout(() => {
            setIsPageLoading(false);
            // Fade in content
            setOpacity(1);
        }, 1000);

        return () => clearTimeout(timer);
    }, []);

    const navigateDelay = (url) => {
        // Fade out
        setOpacity(0);
        setIsTransitioning(true);

        // Wait 1s for animation then push
        setTimeout(() => {
            router.push(url).then(() => {
                // After route change, fade back in
                // Note: Since _app persists, we can control this. 
                // However, next.js might re-render. We need to ensure opacity goes back to 1.
                // Resetting state after navigation.
                setIsTransitioning(false);
                // Small delay to allow new page to mount then fade in?
                // actually usually we want the new page to fade in.
                setTimeout(() => setOpacity(1), 100);
            });
        }, 1000);
    };

    return (
        <TransitionContext.Provider value={{ navigateDelay, isPageLoading, isTransitioning, opacity }}>
            {/* Loading Screen Overlay */}
            {/* Loading Screen Overlay */}
            {(isPageLoading || isTransitioning) && (
                <div className={`fixed inset-0 z-[99999] bg-[#141414] flex items-center justify-center transition-opacity duration-700 ${opacity === 1 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                    {/* Only show spinner on initial load, NOT on navigation transition */}
                    {isPageLoading && (
                        <div className="flex flex-col items-center">
                            <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                        </div>
                    )}
                </div>
            )}

            {/* Main Content Wrapper with fade transition */}
            <div
                className="transition-opacity duration-700 ease-in-out"
                style={{ opacity: opacity }}
            >
                {children}
            </div>
        </TransitionContext.Provider>
    );
}

export function useTransition() {
    return useContext(TransitionContext);
}
