// État partagé de l'overlay et des mises à jour du site :
// - on sait si la mini-fenêtre est ouverte (pour ne pas recharger la page sous elle) ;
// - si la page a été rechargée alors que l'overlay était ouvert, on propose de le rouvrir en un clic ;
// - une nouvelle version du site attend la fermeture de l'overlay au lieu de tout recharger d'un coup.
import { useSyncExternalStore } from 'react';

const WAS_OPEN = 'fzth:v2:overlayWasOpen';
let open = false;
let unloading = false;
let applyUpdate: (() => void) | null = null;
let wasOpen = (() => { try { return localStorage.getItem(WAS_OPEN) === '1'; } catch { return false; } })();
const ls = new Set<() => void>(); let v = 0;
const emit = () => { v++; ls.forEach(l => l()); };
if (typeof window !== 'undefined') { window.addEventListener('beforeunload', () => { unloading = true; }); window.addEventListener('pagehide', () => { unloading = true; }); }

export function overlayOpened() { open = true; wasOpen = false; try { localStorage.setItem(WAS_OPEN, '1'); } catch { /* ignore */ } emit(); }
export function overlayClosed() {
  open = false;
  // Fermée par l'utilisateur (et pas par un rechargement de la page) : on oublie.
  if (!unloading) try { localStorage.removeItem(WAS_OPEN); } catch { /* ignore */ }
  emit();
  if (applyUpdate && !unloading) applyUpdate();
}
export const isOverlayOpen = () => open;
export const forgetReopen = () => { wasOpen = false; try { localStorage.removeItem(WAS_OPEN); } catch { /* ignore */ } emit(); };

/** Nouvelle version prête : appliquée tout de suite, sauf si l'overlay est ouvert (on attend sa fermeture). */
export function updateReady(apply: () => void) {
  applyUpdate = apply;
  const inOverlayPage = location.hash === '#overlay';
  if (!open && !inOverlayPage) apply(); else emit();
}
export const applyNow = () => applyUpdate?.();

export function useOverlayState() {
  useSyncExternalStore(cb => { ls.add(cb); return () => ls.delete(cb); }, () => v);
  return { open, wasOpen: wasOpen && !open, updatePending: !!applyUpdate };
}
