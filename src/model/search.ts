// Index de tous les objectifs (toutes les variantes d'alignement / métier comprises) :
// recherche globale et libellés lisibles pour le journal.
import { catalog, norm, type ItemView } from './catalog';
import { dofusInfo } from '../data/tougli/dofus-info';

export interface Hit { item: ItemView; dofus: { id: string; name: string; section: string }[] }

const index = new Map<string, Hit>();
for (const d of catalog) for (const s of d.sections) for (const i of s.items) {
  const alts = i.variant ? [...i.variant.cases.map(c => c.item), i.variant.else].filter((x): x is ItemView => !!x) : [i];
  for (const a of alts) {
    const h = index.get(a.id) ?? { item: a, dofus: [] };
    if (!h.dofus.some(x => x.id === d.id)) h.dofus.push({ id: d.id, name: d.name, section: s.title });
    index.set(a.id, h);
  }
}
const hits = [...index.values()];
const keyOf = new Map(hits.map(h => [h.item.id, norm(h.item.name)]));

export function search(q: string, limit = 40): { quests: Hit[]; dofus: { id: string; name: string }[] } {
  const k = norm(q);
  if (k.length < 2) return { quests: [], dofus: [] };
  const quests = hits.filter(h => keyOf.get(h.item.id)!.includes(k))
    .sort((a, b) => Number(!keyOf.get(a.item.id)!.startsWith(k)) - Number(!keyOf.get(b.item.id)!.startsWith(k)) || a.item.name.localeCompare(b.item.name, 'fr'))
    .slice(0, limit);
  return { quests, dofus: dofusInfo.filter(d => norm(d.name).includes(k)).map(d => ({ id: d.id, name: d.name })) };
}

const dofusName = (id: string) => dofusInfo.find(d => d.id === id)?.name ?? id;
/** Libellé lisible d'une clé de progression (journal). */
export function labelOf(id: string): string {
  if (index.has(id)) return index.get(id)!.item.name;
  let m: RegExpMatchArray | null;
  if ((m = id.match(/^res:([^:]+):(.+)$/))) return `Ressource ${m[2]} (${dofusName(m[1])})`;
  if ((m = id.match(/^job:(.+)$/))) return `Ressource métier ${m[1].replace(/-/g, ' ')}`;
  if ((m = id.match(/^alm-prep:(.+)$/))) return `Almanax du ${m[1]} préparé`;
  if ((m = id.match(/^alm-done:(.+)$/))) return `Almanax du ${m[1]} fait`;
  return id;
}
export const dofusOf = (id: string) => index.get(id)?.dofus ?? [];
