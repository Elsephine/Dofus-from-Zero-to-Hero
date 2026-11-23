// Icônes des objets (par nom exact) et images des boss, récupérées PAR LE SERVEUR DU SITE (RPC fzth_icons / fzth_boss_imgs) :
// le navigateur ne contacte jamais dofusdu.de ni dofusdb.fr, ces sites ne voient donc pas votre adresse IP.
// Les images arrivent en « data: » et sont gardées dans le navigateur (aussi les absences) pour ne les demander qu'une fois.
import { useSyncExternalStore } from 'react';
import { codeFor, isUnlocked, rpc } from './progress';
import { profiles } from './profiles';

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
try { localStorage.removeItem('fzth:v2:resIcons'); } catch { /* ancien cache d'adresses externes */ }

let version = 0; const listeners = new Set<() => void>();
const emit = () => { version++; listeners.forEach(l => l()); };
const me = () => profiles.map(x => x.id).find(isUnlocked);

function makeStore<K extends string | number>(lsKey: string, fn: string, arg: string, batch: number) {
  let cache: Record<string, string> = (() => { try { return JSON.parse(localStorage.getItem(lsKey) ?? '{}'); } catch { return {}; } })();
  const want = new Map<string, K>(); const inFlight = new Set<string>();
  let timer: ReturnType<typeof setTimeout> | null = null; let saveTimer: ReturnType<typeof setTimeout> | null = null; let running = false;
  const persist = () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(lsKey, JSON.stringify(cache)); }
      catch { /* stockage plein : on garde en mémoire seulement */ }
    }, 800);
  };
  async function flush() {
    timer = null; const p = me(); if (p === undefined || running) return;
    const keys = [...want.keys()].filter(k => !inFlight.has(k)).slice(0, batch); if (!keys.length) return;
    running = true; keys.forEach(k => inFlight.add(k));
    try {
      const res = await rpc<Record<string, string>>(fn, { p_profile: p, p_code: codeFor(p), [arg]: keys.map(k => want.get(k)) });
      for (const k of keys) {
        const raw = want.get(k)!; const v = res?.[String(raw)];
        if (typeof v === 'string' && (v === '' || v.startsWith('data:image/'))) { cache[k] = v; want.delete(k); }
      }
      persist(); emit();
    } catch { /* hors ligne : on réessaiera */ }
    keys.forEach(k => inFlight.delete(k)); running = false;
    if ([...want.keys()].some(k => !inFlight.has(k) && !(k in cache))) timer = setTimeout(flush, 400);
  }
  /** undefined = en cours, null = pas d'image, sinon l'image. */
  return (raw: K, key: string): string | null | undefined => {
    if (key in cache) return cache[key] || null;
    if (!want.has(key)) { want.set(key, raw); if (!timer) timer = setTimeout(flush, 120); }
    return undefined;
  };
}

const icons = makeStore<string>('fzth:v2:icons', 'fzth_icons', 'p_names', 20);
const bosses = makeStore<number>('fzth:v2:bossImgs', 'fzth_boss_imgs', 'p_ids', 20);

export const iconFor = (name: string) => icons(name, norm(name)) ?? undefined;
export const bossImgFor = (id: number) => bosses(id, String(id));
const useVersion = () => useSyncExternalStore(cb => { listeners.add(cb); return () => listeners.delete(cb); }, () => version);
export function useResourceIcon(name: string) { useVersion(); return name ? iconFor(name) : undefined; }
export function useBossImg(ids: number[]): string | undefined | null {
  useVersion();
  let pending = false;
  for (const id of ids) { const v = bossImgFor(id); if (v) return v; if (v === undefined) pending = true; }
  return pending ? undefined : null; // null = aucune image
}
