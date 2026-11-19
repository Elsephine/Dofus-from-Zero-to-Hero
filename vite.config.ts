import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// base relative : fonctionne sur https://elsephine.github.io/Dofus-from-Zero-to-Hero/ comme en local.
export default defineConfig({ plugins: [react()], base: './' });
