import '../styles/globals.css';
import { Inter } from 'next/font/google';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import Head from 'next/head';

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

  /*
   * MOBILE PERFORMANCE:
   * Instead of animating scale/borderRadius/y with spring physics on every frame
   * (which forces the browser to paint the entire page DOM tree per frame),
   * we use a simple CSS class toggle with GPU-composited transform: scale3d().
   * The transition uses a fast ease-out curve — no spring physics overhead.
   */
  const pageScaleStyle = mobileMode ? {
    transformOrigin: "top center",
    overflow: isModalOpen ? "hidden" : "visible",
    transition: "transform 0.35s cubic-bezier(0.25, 0.1, 0.25, 1), border-radius 0.35s cubic-bezier(0.25, 0.1, 0.25, 1)",
    transform: isModalOpen ? "scale3d(0.92, 0.92, 1) translateY(-10px)" : "scale3d(1, 1, 1) translateY(0)",
    borderRadius: isModalOpen ? "16px" : "0px",
    willChange: isModalOpen ? "transform" : "auto",
  } : {
    transformOrigin: "top center",
    overflow: "visible",
  };

  return (
    <>
      {/* Disable pinch-to-zoom on mobile */}
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </Head>

      {/* Main page content — scales down when modal opens on mobile */}
      <div
        className={inter.className}
        style={pageScaleStyle}
      >
        <Component {...pageProps} />
      </div>

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

