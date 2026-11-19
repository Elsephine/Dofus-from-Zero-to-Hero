// Installation du site comme une appli (PWA) : on garde l'invitation du navigateur pour l'ouvrir depuis le menu.
import { useSyncExternalStore } from 'react';

interface BIPEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }
let deferred: BIPEvent | null = null;
let installed = typeof matchMedia !== 'undefined' && (matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true);
const ls = new Set<() => void>(); let v = 0;
const emit = () => { v++; ls.forEach(l => l()); };
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e as BIPEvent; emit(); });
  window.addEventListener('appinstalled', () => { installed = true; deferred = null; emit(); });
}
export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
export async function install() {
  if (!deferred) return false;
  await deferred.prompt(); const r = await deferred.userChoice; deferred = null; emit();
  return r.outcome === 'accepted';
}
export function useInstall() {
  useSyncExternalStore(cb => { ls.add(cb); return () => ls.delete(cb); }, () => v);
  return { canPrompt: !!deferred, installed, ios: isIOS() };
}
