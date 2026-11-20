// Ressources des métiers (liste globale sans doublons), niveau visé par métier et clé de progression d'une ressource.
import { useSyncExternalStore } from 'react';
import { jobs, jobCrafts, type JobPlan } from '../data/metiers';

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
export const jobKey = (name: string) => 'job:' + norm(name).replace(/[^a-z0-9]+/g, '-');

// ---- Niveau visé par métier (choisi par palier, retenu sur l'appareil) ----
const LS = 'fzth:v2:jobLevels';
let levels: Record<string, number> = (() => { try { return JSON.parse(localStorage.getItem(LS) ?? '{}'); } catch { return {}; } })();
const subs = new Set<() => void>();
let version = 0;
/** Fin de palier : « 10–20 » → 20. */
export const palierEnd = (lv: string) => Number(lv.split(/[–-]/).pop());
/** Niveaux proposés pour un métier (fins de palier). */
export const levelChoices = (j: JobPlan) => (jobCrafts[j.name] ?? []).map(c => palierEnd(c[0]));
export const jobLevel = (j: JobPlan) => levels[j.name] ?? j.target;
export function setJobLevel(name: string, lvl: number) {
  levels = { ...levels, [name]: lvl }; try { localStorage.setItem(LS, JSON.stringify(levels)); } catch { /* ignore */ }
  cache = null; version++; subs.forEach(f => f());
}
export const useJobLevels = () => useSyncExternalStore(f => { subs.add(f); return () => subs.delete(f); }, () => version);

/** Ressources d'un métier jusqu'au niveau visé (somme des paliers), sinon la liste du guide. */
export function jobItems(j: JobPlan): [string, number][] {
  const cr = jobCrafts[j.name]; const lvl = jobLevel(j);
  if (!cr || cr.some(c => !c[3])) return j.items;
  const m = new Map<string, [string, number]>();
  for (const [lv, , n, ing] of cr) {
    if (palierEnd(lv) > lvl) break;
    for (const [name, q] of ing) { const k = norm(name).replace(/[^a-z0-9]+/g, ''); const e = m.get(k); if (e) e[1] += q * n; else m.set(k, [name, q * n]); }
  }
  return [...m.values()];
}

// Une ressource demandée par plusieurs métiers n'apparaît qu'une fois dans la liste globale (quantités additionnées).
let cache: { name: string; qty: number; jobs: string[] }[] | null = null;
export function allJobRes() {
  if (cache) return cache;
  const m = new Map<string, { name: string; qty: number; jobs: string[] }>();
  for (const j of jobs) for (const [n, q] of jobItems(j)) {
    const k = norm(n).replace(/[^a-z0-9]+/g, '');
    if (!m.has(k)) m.set(k, { name: n, qty: 0, jobs: [] });
    const e = m.get(k)!; e.qty += q; e.jobs.push(j.name);
  }
  return (cache = [...m.values()].sort((a, b) => a.name.localeCompare(b.name, 'fr')));
}
