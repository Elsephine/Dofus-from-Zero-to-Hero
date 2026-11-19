import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
// base relative : fonctionne sur https://elsephine.github.io/Dofus-from-Zero-to-Hero/ comme en local.
// PWA : site installable (écran d'accueil du téléphone / PC) et utilisable hors ligne.
export default defineConfig({
  base: './',
  define: { __BUILD__: JSON.stringify(new Date().toISOString()) },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: null, // enregistré dans main.tsx
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'From Zero to Hero · Dofus',
        short_name: 'Zero to Hero',
        description: 'Quêtes des Dofus, succès, métiers et almanax pour Furionette, Volrod et Zepharyen.',
        lang: 'fr', start_url: './', scope: './', display: 'standalone', orientation: 'any',
        background_color: '#f6efea', theme_color: '#c8283c',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,webp,png,svg}'],
        globIgnores: ['legacy/**'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: 'index.html',
        runtimeCaching: [
          { urlPattern: ({ url }) => url.hostname === 'api.dofusdu.de', handler: 'StaleWhileRevalidate', options: { cacheName: 'dofusdude', expiration: { maxEntries: 600, maxAgeSeconds: 30 * 86400 } } },
          { urlPattern: ({ url }) => url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com'), handler: 'CacheFirst', options: { cacheName: 'fonts', expiration: { maxEntries: 20, maxAgeSeconds: 365 * 86400 } } },
        ],
      },
    }),
  ],
});
