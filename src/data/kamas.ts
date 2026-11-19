import type { Database } from './types';
// Total des kamas d'un parcours = somme des récompenses des succès + des quêtes du parcours, sans double compte (dédoublonnage par id).
// Seules les valeurs lues sur DPLN sont comptées ; le reste est listé dans `missing` (le total est alors PARTIEL, jamais présenté comme complet).
export function parcoursKamas(db: Database, dofusId: string) {
  const seenA = new Set<string>(), seenQ = new Set<string>(), seenD = new Set<string>();
  const addQuest = (id: string) => {
    if (seenQ.has(id) || !db.quests[id]) return; seenQ.add(id);
    for (const r of db.quests[id].requires ?? []) { if (db.achievements[r]) addAch(r); else addQuest(r); }
  };
  const addAch = (id: string) => {
    if (seenA.has(id) || !db.achievements[id]) return; seenA.add(id);
    const a = db.achievements[id];
    a.questIds.forEach(addQuest); (a.subAchievementIds ?? []).forEach(addAch);
  };
  const addDofus = (id: string) => {
    if (seenD.has(id) || !db.dofus[id]) return; seenD.add(id);
    const d = db.dofus[id]; d.achievementIds.forEach(addAch); (d.requiresDofusIds ?? []).forEach(addDofus);
  };
  addDofus(dofusId);
  let total = 0; const missing: string[] = [];
  for (const id of seenA) { const k = db.achievements[id].rewardKamas; if (k === undefined) missing.push(`succès ${db.achievements[id].name}`); else total += k; }
  for (const id of seenQ) { const k = db.quests[id].rewardKamas; if (k === undefined) missing.push(`quête ${db.quests[id].name}`); else total += k; }
  return { total, complete: missing.length === 0, achievements: seenA.size, quests: seenQ.size, missing };
}
