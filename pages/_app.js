import '../styles/globals.css';
import { Inter } from 'next/font/google';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

const inter = Inter({ subsets: ['latin'] });

import { ModalProvider, useModal } from '../context/ModalContext';
import { TransitionProvider } from '../context/TransitionContext';
import InfoModal from '../components/InfoModal';

// Inner component that can access modal context
function AppContent({ Component, pageProps }) {
  const { isModalOpen } = useModal();
  const [mobileMode, setMobileMode] = useState(false);

  useEffect(() => {
    const checkMobile = () => setMobileMode(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <>
      {/* Main page content — scales down when modal opens on mobile */}
      <motion.div
        className={inter.className}
        animate={mobileMode ? {
          scale: isModalOpen ? 0.92 : 1,
          borderRadius: isModalOpen ? '16px' : '0px',
          y: isModalOpen ? -10 : 0,
        } : {
          scale: 1,
          borderRadius: "0px",
          y: 0
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 35,
        }}
        style={{
          transformOrigin: "top center",
          overflow: (isModalOpen && mobileMode) ? "hidden" : "visible",
        }}
      >
        <Component {...pageProps} />
      </motion.div>

      {/* Modal rendered outside the scaled container */}
      <AnimatePresence mode="wait">
        {isModalOpen && <InfoModal key="info-modal" />}
      </AnimatePresence>
    </>
  );
}

export default function App({ Component, pageProps }) {
  return (
    <TransitionProvider>
      <ModalProvider>
        <AppContent Component={Component} pageProps={pageProps} />
      </ModalProvider>
    </TransitionProvider>
  );
}
