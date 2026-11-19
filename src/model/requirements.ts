// Résumé de ce que demande un Dofus (combats, donjons, bashing, songes, métiers, aide…) à partir des icônes de ses quêtes.
import type { DofusView } from './catalog';
import { iconInfo, type IconFamily } from './icons';

export interface ReqEntry { type: string; label: string; count: number; details: { quest: string; text?: string }[] }
export type Requirements = Record<IconFamily, ReqEntry[]>;

export function requirements(dofus: DofusView, isDone: (id: string) => boolean, includeDone = false): Requirements {
  const out: Requirements = { combat: [], donjon: [], bashing: [], special: [], metier: [], aide: [] };
  const map = new Map<string, ReqEntry>();
  const seen = new Set<string>();
  for (const s of dofus.sections) for (const i of s.items) {
    if (seen.has(i.id)) continue;
    seen.add(i.id);
    if (!includeDone && isDone(i.id)) continue;
    const objs = [...(i.objectives ?? [])];
    // Donjon connu seulement par l'encadré (Dom de Pin) : on l'ajoute s'il n'est pas déjà dans les icônes.
    if (i.dungeon?.name && !objs.some(o => o.type === 'donjon')) objs.push({ type: 'donjon', label: i.dungeon.name });
    for (const o of objs) {
      const info = iconInfo(o.type);
      const k = info.family === 'donjon' && o.label && !/^x?\d+$/.test(o.label) ? 'donjon:' + o.label.toLowerCase() : o.type;
      let e = map.get(k);
      if (!e) {
        e = { type: o.type, label: info.family === 'donjon' && o.label ? o.label : info.label, count: 0, details: [] };
        map.set(k, e); out[info.family].push(e);
      }
      e.count += info.family === 'combat' ? (o.count ?? 1) : 1;
      e.details.push({ quest: i.name, text: o.label ?? (o.count ? `×${o.count}` : undefined) });
    }
  }
  for (const f of Object.keys(out) as IconFamily[]) out[f].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'fr'));
  return out;
}
