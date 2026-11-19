// Ressources nécessaires d'un Dofus = somme des ressources des quêtes encore à faire (onglet « database » du classeur Tougli).
import { questResources } from '../data/tougli/resources';
import type { DofusView } from './catalog';

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
const byName = new Map(Object.entries(questResources).map(([k, v]) => [norm(k), v]));

export interface ResourceNeed { name: string; qty: number; quests: string[] }

export function questNeeds(questName: string): [string, number][] { return byName.get(norm(questName)) ?? []; }

/** includeDone = false : seules les quêtes non cochées comptent (les besoins baissent quand on avance). */
export function resourceNeeds(dofus: DofusView, isDone: (id: string) => boolean, includeDone = false) {
  const acc = new Map<string, ResourceNeed>();
  const seen = new Set<string>();
  for (const s of dofus.sections) for (const i of s.items) {
    if (i.kind !== 'quest' || seen.has(i.id)) continue;
    seen.add(i.id);
    if (!includeDone && isDone(i.id)) continue;
    for (const [name, qty] of questNeeds(i.name)) {
      const r = acc.get(name) ?? { name, qty: 0, quests: [] };
      r.qty += qty; r.quests.push(i.name); acc.set(name, r);
    }
  }
  const all = [...acc.values()].sort((a, b) => b.qty - a.qty || a.name.localeCompare(b.name, 'fr'));
  return { kamas: all.find(r => r.name === 'Kamas') ?? null, items: all.filter(r => r.name !== 'Kamas') };
}
