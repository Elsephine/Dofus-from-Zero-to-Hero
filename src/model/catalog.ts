// Transforme la base (src/data) en une liste de Dofus prête à afficher. L'interface ne lit que ce catalogue.
import { database as db } from '../data';
import { parcoursKamas } from '../data/kamas';
import { domDePin, domDePinHeader, type DomDePinDungeon, type DomDePinObjective } from '../data/dom-de-pin';

export interface ItemView {
  id: string;               // clé de sauvegarde (stable)
  name: string;
  kind: 'quest' | 'achievement';
  url?: string;
  level?: number;
  kamas?: number;
  note?: string;
  hint?: string;
  tag?: string;
  group?: string;
  dungeon?: DomDePinDungeon;
  objectives?: DomDePinObjective[];
  toConfirm?: boolean;
}
export interface SectionView { id: string; title: string; items: ItemView[] }
export interface DofusView {
  id: string;
  name: string;
  url?: string;
  sections: SectionView[];
  kamas: { total: number; complete: boolean } | null;
  itemIds: string[];        // tous les objectifs cochables, sans doublon
  requiresDofus?: string[]; // Dofus inclus dans le parcours (prérequis)
}

function fromDatabase(dofusId: string): DofusView {
  const d = db.dofus[dofusId];
  const sections: SectionView[] = [];
  const shownQ = new Set<string>(), seenA = new Set<string>(), seenD = new Set<string>();
  const prereqQ: string[] = []; const prereqDofus: string[] = [];
  const view = (qid: string): ItemView => {
    const q = db.quests[qid];
    return { id: q.id, name: q.name, kind: 'quest', url: q.url, level: q.level, kamas: q.rewardKamas, note: q.note, toConfirm: q.status === 'toConfirm' };
  };
  // Prérequis d'une quête : succès -> sa propre section ; quête -> section « Prérequis ». Même parcours que parcoursKamas.
  const visitReq = (qid: string) => {
    for (const r of db.quests[qid]?.requires ?? []) {
      if (db.achievements[r]) visitAch(r);
      else if (db.quests[r] && !shownQ.has(r)) { shownQ.add(r); visitReq(r); prereqQ.push(r); }
    }
  };
  const visitAch = (achId: string) => {
    const a = db.achievements[achId];
    if (!a || seenA.has(achId)) return;
    seenA.add(achId);
    const own = a.questIds.filter(qid => db.quests[qid] && !shownQ.has(qid));
    own.forEach(qid => shownQ.add(qid));
    own.forEach(visitReq);
    (a.subAchievementIds ?? []).forEach(visitAch);
    sections.push({ id: a.id, title: a.name, items: own.map(view) });
  };
  const visitDofus = (id: string, root: boolean) => {
    if (seenD.has(id) || !db.dofus[id]) return; seenD.add(id);
    if (!root) prereqDofus.push(db.dofus[id].name);
    db.dofus[id].achievementIds.forEach(visitAch);
    (db.dofus[id].requiresDofusIds ?? []).forEach(r => visitDofus(r, false));
  };
  visitDofus(dofusId, true);
  if (prereqQ.length) sections.unshift({ id: dofusId + '-prerequis', title: 'Prérequis', items: prereqQ.map(view) });
  const k = parcoursKamas(db, dofusId);
  return finish({ id: d.id, name: d.name, url: d.url, sections: sections.filter(s => s.items.length), kamas: { total: k.total, complete: k.complete }, itemIds: [], requiresDofus: prereqDofus });
}

// Une quête présente dans plusieurs Dofus doit partager la même clé de sauvegarde : cochée une fois, comptée partout.
// Les objectifs du Dom de Pin reprennent donc l'id de la base quand le nom correspond (accents/ponctuation ignorés).
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
const dbIdByName = new Map<string, string>();
for (const q of Object.values(db.quests)) dbIdByName.set('quest:' + norm(q.name), q.id);
for (const a of Object.values(db.achievements)) dbIdByName.set('achievement:' + norm(a.name), a.id);

function fromDomDePin(): DofusView {
  return finish({
    id: 'dom-de-pin', name: domDePinHeader.name, url: 'https://www.dofuspourlesnoobs.com/dom-de-pin.html', kamas: null, itemIds: [],
    sections: domDePin.map(s => ({ id: s.id, title: s.title, items: s.items.map(i => {
      const dbId = dbIdByName.get(i.kind + ':' + norm(i.name));
      const q = dbId ? db.quests[dbId] : undefined;
      return { ...i, id: dbId ?? i.id, url: i.url ?? q?.url ?? (dbId ? db.achievements[dbId]?.url : undefined), level: q?.level, kamas: q?.rewardKamas };
    }) })),
  });
}

function finish(v: DofusView): DofusView {
  const ids = new Set<string>();
  for (const s of v.sections) for (const i of s.items) ids.add(i.id);
  return { ...v, itemIds: [...ids] };
}

// Ordre du journal : Dom de Pin puis les Dofus de la base dans l'ordre de src/data/index.ts.
export const catalog: DofusView[] = [fromDomDePin(), ...Object.keys(db.dofus).map(fromDatabase)];
