import '../styles/globals.css';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

import { ModalProvider } from '../context/ModalContext';
import { TransitionProvider } from '../context/TransitionContext';
import InfoModal from '../components/InfoModal';

export default function App({ Component, pageProps }) {
  return (
    <TransitionProvider>
      <ModalProvider>
        <div className={inter.className}>
          <Component {...pageProps} />
          <InfoModal />
        </div>
      </ModalProvider>
    </TransitionProvider>
  );
}
