// Ressources des métiers (liste globale sans doublons) et clé de progression d'une ressource.
import { jobs } from '../data/metiers';

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
export const jobKey = (name: string) => 'job:' + norm(name).replace(/[^a-z0-9]+/g, '-');

// Une ressource demandée par plusieurs métiers n'apparaît qu'une fois dans la liste globale (quantités additionnées).
function allItems() {
  const m = new Map<string, { name: string; qty: number; jobs: string[] }>();
  for (const j of jobs) for (const [n, q] of j.items) {
    const k = norm(n);
    if (!m.has(k)) m.set(k, { name: n, qty: 0, jobs: [] });
    const e = m.get(k)!; e.qty += q; e.jobs.push(j.name);
  }
  return [...m.values()].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}
export const ALL_JOB_RES = allItems();
