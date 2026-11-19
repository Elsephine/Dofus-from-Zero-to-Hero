// Célébrations : confettis rouges et or (quête / succès validés) et grande annonce « Dofus obtenu ! ».
import confetti from 'canvas-confetti';
import { useSyncExternalStore } from 'react';

const COLORS = ['#c8283c', '#e2475b', '#d8ad62', '#f0cf8c', '#ffffff'];
const calm = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Petite gerbe partant de l'élément cliqué. */
export function burst(el?: Element | null, big = false) {
  if (calm()) return;
  const r = el?.getBoundingClientRect();
  const origin = r ? { x: (r.left + r.width / 2) / innerWidth, y: (r.top + r.height / 2) / innerHeight } : { x: .5, y: .6 };
  void confetti({ particleCount: big ? 90 : 28, spread: big ? 80 : 50, startVelocity: big ? 38 : 22, scalar: .8, ticks: 120, origin, colors: COLORS, disableForReducedMotion: true });
}

let trophy: { name: string; image?: string | null } | null = null;
const ls = new Set<() => void>();
export function celebrateDofus(name: string, image?: string | null) {
  trophy = { name, image }; ls.forEach(l => l());
  if (calm()) return;
  const end = Date.now() + 1600;
  const frame = () => {
    void confetti({ particleCount: 6, angle: 60, spread: 60, origin: { x: 0, y: .7 }, colors: COLORS });
    void confetti({ particleCount: 6, angle: 120, spread: 60, origin: { x: 1, y: .7 }, colors: COLORS });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
}
export const closeTrophy = () => { trophy = null; ls.forEach(l => l()); };
export const useTrophy = () => useSyncExternalStore(cb => { ls.add(cb); return () => ls.delete(cb); }, () => trophy);
