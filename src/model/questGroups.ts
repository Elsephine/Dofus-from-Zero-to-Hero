// Regroupement des quêtes d'un Dofus : par succès du jeu (comme Tougli) ou par étape du guide.
// Utilisé par la page d'un Dofus et par l'overlay, pour qu'ils rangent les quêtes de la même façon.
import type { ItemView, SectionView } from './catalog';
import { achsForQuest, type AchData } from './achievements';

export type GroupBy = 'succes' | 'etapes';
export interface QuestGroup { id: string; title: string; section: string; items: ItemView[]; ach?: { id: number; pts: number; total: number } }
export const GROUP_KEY = 'fzth:v2:groupBy';
export const readGroupBy = (): GroupBy => { try { return JSON.parse(localStorage.getItem(GROUP_KEY) ?? '"succes"') === 'etapes' ? 'etapes' : 'succes'; } catch { return 'succes'; } };

export function groupQuests(sections: SectionView[], mode: GroupBy, achD: AchData | null): QuestGroup[] {
  if (mode === 'etapes' || !achD) return sections.map(sec => ({ id: sec.id, title: sec.title, section: sec.title, items: sec.items }));
  const out: QuestGroup[] = []; const byKey = new Map<string, QuestGroup>();
  for (const sec of sections) for (const it of sec.items) {
    const a = achsForQuest(achD, it.name)[0];
    const k = a ? `a${a.id}` : `s${sec.id}`;
    let g = byKey.get(k);
    if (!g) {
      g = a ? { id: k, title: a.n, section: sec.title, items: [], ach: { id: a.id, pts: a.p, total: a.o?.length ?? 1 } }
        : { id: k, title: `${sec.title} · autres quêtes`, section: sec.title, items: [] };
      byKey.set(k, g); out.push(g);
    }
    if (!g.items.some(x => x.id === it.id)) g.items.push(it);
  }
  return out;
}
