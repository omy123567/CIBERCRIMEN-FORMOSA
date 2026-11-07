import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register service worker for offline support and cross-platform installation
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  registerSW({
    immediate: true,
    onRegisterError(error) {
      console.debug('[PWA SW]:', error);
    }
  });
}

createRoot(document.getElementById('root')!).render(<App />);

