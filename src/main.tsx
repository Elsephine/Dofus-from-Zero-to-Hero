import '@fontsource/cinzel/500.css';
import '@fontsource/cinzel/700.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';
import { registerSW } from 'virtual:pwa-register';
import './model/install';

import { updateReady } from './model/overlayState';

// Hors ligne + mises à jour automatiques. Une nouvelle version prend la main dès qu'elle est publiée ;
// la page se recharge alors toute seule, sauf pendant que l'overlay est ouvert (elle attend qu'on le ferme).
const hadController = 'serviceWorker' in navigator && !!navigator.serviceWorker.controller;
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController) updateReady(() => location.reload()); });
}
registerSW({
  immediate: true,
  onNeedRefresh() { updateReady(() => location.reload()); },
  // Le site reste souvent ouvert longtemps : on vérifie s'il y a une nouvelle version toutes les 5 minutes et au retour sur l'onglet.
  onRegisteredSW(_url, reg) {
    if (!reg) return;
    setInterval(() => void reg.update().catch(() => {}), 5 * 60 * 1000);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void reg.update().catch(() => {}); });
  },
});
// Morceau du site introuvable (ancienne version encore ouverte après une mise à jour) : on recharge.
window.addEventListener('vite:preloadError', () => location.reload());

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
