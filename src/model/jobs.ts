// Ressources des métiers (liste globale sans doublons), niveau visé par métier et clé de progression d'une ressource.
import { useSyncExternalStore } from 'react';
import { jobs, jobCrafts, type JobPlan } from '../data/metiers';
import { qtyOf } from './progress';

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
  version++; subs.forEach(f => f());
}
export const useJobLevels = () => useSyncExternalStore(f => { subs.add(f); return () => subs.delete(f); }, () => version);

/** Id de progression d'un palier de craft (coché = fait, ses ressources ne sont plus comptées). */
export const craftId = (job: string, i: number) => `craft:${job}:${i}`;
type Skip = (job: string, i: number) => boolean;
const nk = (s: string) => norm(s).replace(/[^a-z0-9]+/g, '');

/** Ressources d'un métier jusqu'au niveau visé (somme des paliers non cochés), sinon la liste du guide. */
export function jobItems(j: JobPlan, skip?: Skip): [string, number][] {
  const cr = jobCrafts[j.name]; const lvl = jobLevel(j);
  if (!cr || cr.some(c => !c[3])) return j.items;
  const m = new Map<string, [string, number]>();
  cr.forEach(([lv, , n, ing], i) => {
    if (palierEnd(lv) > lvl || skip?.(j.name, i)) return;
    for (const [name, q] of ing) { const k = nk(name); const e = m.get(k); if (e) e[1] += q * n; else m.set(k, [name, q * n]); }
  });
  return [...m.values()];
}
/** Niveau actuel d'un personnage dans un métier (saisi dans Métiers, partagé avec l'équipe). */
export const jobLvlKey = (job: string) => 'joblvl:' + job;
export const myJobLevel = (p: number, job: string) => qtyOf(p, jobLvlKey(job)) ?? 0;
/** Palier déjà fait : coché, ou dépassé par le niveau actuel du personnage. */
export const palierDone = (p: number, job: string, i: number, done: (p: number, id: string) => boolean) => {
  const c = jobCrafts[job]?.[i]; return done(p, craftId(job, i)) || (!!c && palierEnd(c[0]) <= myJobLevel(p, job));
};
/** Même chose additionnée pour plusieurs personnages (chacun avec ses paliers cochés ou dépassés). */
export function jobItemsFor(j: JobPlan, ids: number[], done: (p: number, id: string) => boolean): [string, number][] {
  const m = new Map<string, [string, number]>();
  for (const p of ids) for (const [n, q] of jobItems(j, (job, i) => palierDone(p, job, i, done))) { const k = nk(n); const e = m.get(k); if (e) e[1] += q; else m.set(k, [n, q]); }
  return [...m.values()];
}

/** Liste globale sans doublons (quantités additionnées), pour un ou plusieurs personnages. */
export function allJobRes(ids?: number[], done?: (p: number, id: string) => boolean) {
  const m = new Map<string, { name: string; qty: number; jobs: string[] }>();
  for (const j of jobs) for (const [n, q] of (ids && done ? jobItemsFor(j, ids, done) : jobItems(j))) {
    const k = nk(n);
    if (!m.has(k)) m.set(k, { name: n, qty: 0, jobs: [] });
    const e = m.get(k)!; e.qty += q; if (!e.jobs.includes(j.name)) e.jobs.push(j.name);
  }
  return [...m.values()].filter(x => x.qty > 0).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}
