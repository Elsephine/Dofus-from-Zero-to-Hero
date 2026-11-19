// Illustrations officielles des ressources (icônes du jeu), récupérées par leur nom via l'API publique Dofusdude
// (/dofus3/v1/fr/items/search). Seul un nom identique est retenu (jamais d'icône « approchante »).
// Résultats gardés dans le navigateur (aussi les absences) pour ne demander chaque ressource qu'une fois.
import { useSyncExternalStore } from 'react';

const API = 'https://api.dofusdu.de/dofus3/v1/fr/items/search';
const LS = 'fzth:v2:resIcons';
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

let cache: Record<string, string> = (() => { try { return JSON.parse(localStorage.getItem(LS) ?? '{}'); } catch { return {}; } })();
const queue: string[] = []; const queued = new Set<string>();
let running = 0; let version = 0; let saveTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();
const emit = () => { version++; listeners.forEach(l => l()); };
const persist = () => { if (saveTimer) clearTimeout(saveTimer); saveTimer = setTimeout(() => { try { localStorage.setItem(LS, JSON.stringify(cache)); } catch { /* ignore */ } }, 500); };

async function fetchOne(name: string) {
  const k = norm(name);
  try {
    const r = await fetch(`${API}?query=${encodeURIComponent(name)}&limit=8`);
    if (!r.ok) throw new Error(String(r.status));
    const list = (await r.json()) as { name: string; image_urls?: { icon?: string; sd?: string } }[];
    const hit = (list ?? []).find(i => norm(i.name) === k);
    const url = hit?.image_urls?.sd || hit?.image_urls?.icon || '';
    cache[k] = /^https:\/\//.test(url) ? url : '';
  } catch {
    queued.delete(k); return; // réseau : on réessaiera plus tard (rien n'est mémorisé)
  }
  persist(); emit();
}
function pump() {
  while (running < 4 && queue.length) {
    const n = queue.shift()!; running++;
    void fetchOne(n).finally(() => { running--; pump(); });
  }
}

export function iconFor(name: string): string | undefined {
  const k = norm(name);
  if (k in cache) return cache[k] || undefined;
  if (!queued.has(k)) { queued.add(k); queue.push(name); pump(); }
  return undefined;
}

export function useResourceIcon(name: string) {
  useSyncExternalStore(cb => { listeners.add(cb); return () => listeners.delete(cb); }, () => version);
  return iconFor(name);
}
