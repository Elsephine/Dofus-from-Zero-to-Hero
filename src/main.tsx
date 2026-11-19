import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';
import { registerSW } from 'virtual:pwa-register';
import './model/install';

import { updateReady } from './model/overlayState';

// Hors ligne + mises à jour automatiques : la nouvelle version s'installe toute seule,
// sauf pendant que l'overlay est ouvert (elle attend qu'on le ferme, pour ne pas le faire disparaître).
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() { updateReady(() => void updateSW(true)); },
  // Le site reste souvent ouvert longtemps : on vérifie s'il y a une nouvelle version toutes les 5 minutes et au retour sur l'onglet.
  onRegisteredSW(_url, reg) {
    if (!reg) return;
    setInterval(() => void reg.update().catch(() => {}), 5 * 60 * 1000);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void reg.update().catch(() => {}); });
  },
});

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
