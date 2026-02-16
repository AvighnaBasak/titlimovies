import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ContinueWatchingContext = createContext();

export function ContinueWatchingProvider({ children }) {
    const [items, setItems] = useState([]);

    // Load from localStorage on first mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem('continueWatching');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) {
                    setItems(parsed);
                    console.log('[CW Context] Loaded', parsed.length, 'items from localStorage');
                }
            }
        } catch (e) {
            console.error('[CW Context] Failed to load:', e);
        }
    }, []);

    // Save to localStorage whenever items change (skip initial empty)
    useEffect(() => {
        try {
            localStorage.setItem('continueWatching', JSON.stringify(items));
            console.log('[CW Context] Synced to localStorage:', items.length, 'items');
        } catch (e) {
            console.error('[CW Context] Failed to save:', e);
        }
    }, [items]);

    const addItem = useCallback((item) => {
        if (!item || !item.id) return;
        setItems(prev => {
            const filtered = prev.filter(i => String(i.id) !== String(item.id));
            const newList = [{
                id: item.id,
                tmdb_id: item.tmdb_id || item.id,
                title: item.title || item.name || 'Untitled',
                name: item.name || item.title || 'Untitled',
                poster_path: item.poster_path,
                backdrop_path: item.backdrop_path,
                media_type: item.media_type || 'movie',
                season: item.season || 1,
                episode: item.episode || 1,
                progress: item.progress || 5,
                last_watched: Date.now()
            }, ...filtered];
            console.log('[CW Context] Added item:', item.title || item.name, '| Total:', newList.length);
            return newList;
        });
    }, []);

    const removeItem = useCallback((id) => {
        setItems(prev => prev.filter(i => String(i.id) !== String(id)));
    }, []);

    const updateProgress = useCallback((id, progress) => {
        setItems(prev => prev.map(i =>
            String(i.id) === String(id)
                ? { ...i, progress, last_watched: Date.now() }
                : i
        ));
    }, []);

    return (
        <ContinueWatchingContext.Provider value={{ items, addItem, removeItem, updateProgress }}>
            {children}
        </ContinueWatchingContext.Provider>
    );
}

export function useContinueWatching() {
    return useContext(ContinueWatchingContext);
}
