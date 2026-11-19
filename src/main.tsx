import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';
import { registerSW } from 'virtual:pwa-register';
import './model/install';

// Hors ligne + mises à jour automatiques (le site se recharge tout seul quand une nouvelle version est publiée).
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
