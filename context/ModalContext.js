import { createContext, useContext, useState } from 'react';

const ModalContext = createContext();

export function ModalProvider({ children }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState(null); // { id, type }

    const openModal = (item, type = 'movie') => {
        // Ensure we have a valid ID. Fallback to imdb_id or just id.
        const content = {
            ...item,
            // Standardize ID for the modal to use
            id: item.id || item.tmdb_id,
            type: type || item.media_type || 'movie'
        };
        setModalContent(content);
        setIsModalOpen(true);
        // Disable body scroll when modal is open
        if (typeof window !== 'undefined') {
            document.body.style.overflow = 'hidden';
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setModalContent(null);
        if (typeof window !== 'undefined') {
            document.body.style.overflow = 'auto'; // Restore scroll
        }
    };

    return (
        <ModalContext.Provider value={{ isModalOpen, modalContent, openModal, closeModal }}>
            {children}
        </ModalContext.Provider>
    );
}

export function useModal() {
    return useContext(ModalContext);
}
