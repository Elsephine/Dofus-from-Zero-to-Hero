// Succès : chargement paresseux des données du jeu, progression (succès cochés + objectifs cochés),
// « presque finis », points par personnage, planificateur de runs de donjon et événements saisonniers.
import { useEffect, useState } from 'react';
import type { Ach, AchCat } from '../data/jeu/succes';
import type { DungeonAch } from '../data/jeu/donjons';

export type IsDone = (p: number, id: string) => boolean;
export interface AchData { cats: AchCat[]; list: Ach[]; byId: Map<number, Ach>; byName: Map<string, Ach>; catOf: Map<number, AchCat>; top: (catId: number) => AchCat }

let cache: AchData | null = null;
let loading: Promise<AchData> | null = null;
export function loadAch(): Promise<AchData> {
  if (cache) return Promise.resolve(cache);
  loading ??= import('../data/jeu/succes').then(m => {
    const catOf = new Map(m.achCats.map(c => [c.id, c]));
    const top = (id: number) => { let c = catOf.get(id)!; while (c.parent && catOf.get(c.parent)) c = catOf.get(c.parent)!; return c; };
    const byName = new Map<string, Ach>();
    for (const a of m.achievements) if (!byName.has(norm(a.n))) byName.set(norm(a.n), a);
    cache = { cats: m.achCats, list: m.achievements, byId: new Map(m.achievements.map(a => [a.id, a])), byName, catOf, top };
    return cache;
  });
  return loading;
}
export function useAchData(): AchData | null {
  const [d, setD] = useState<AchData | null>(cache);
  useEffect(() => { if (!d) void loadAch().then(setD); }, [d]);
  return d;
}

export const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
export const achKey = (id: number) => `ach:${id}`;
export const objKey = (id: number, i: number) => `acho:${id}:${i}`;

/** Un objectif est fait s'il est coché, ou si c'est lui-même un succès déjà validé (méta-succès). */
export function objDone(d: AchData, a: Ach, i: number, p: number, isDone: IsDone) {
  if (isDone(p, objKey(a.id, i))) return true;
  const sub = d.byName.get(norm(a.o![i]));
  return !!sub && sub.id !== a.id && isDone(p, achKey(sub.id));
}
export function achProgress(d: AchData, a: Ach, p: number, isDone: IsDone) {
  if (isDone(p, achKey(a.id))) return { done: a.o?.length ?? 1, total: a.o?.length ?? 1, complete: true };
  if (!a.o) return { done: 0, total: 1, complete: false };
  const done = a.o.filter((_, i) => objDone(d, a, i, p, isDone)).length;
  return { done, total: a.o.length, complete: false };
}
/** Succès pas encore validés dont au moins la moitié des objectifs est faite (ou tous : il ne reste qu'à valider). */
export function almostDone(d: AchData, p: number, isDone: IsDone) {
  return d.list.map(a => ({ a, ...achProgress(d, a, p, isDone) }))
    .filter(x => !x.complete && x.total > 1 && x.done > 0 && x.done / x.total >= 0.5)
    .sort((x, y) => (x.total - x.done) - (y.total - y.done) || y.a.p - x.a.p);
}
export function pointsOf(d: AchData, p: number, isDone: IsDone) {
  let pts = 0, n = 0;
  for (const a of d.list) if (isDone(p, achKey(a.id))) { pts += a.p; n++; }
  return { pts, n };
}

// ---------- Planificateur de donjon ----------
// Le nom du challenge est entre « » dans la description du succès. Certains challenges s'excluent.
export const challengeOf = (a: DungeonAch) => /« (.+?) »/.exec(a.desc)?.[1] ?? null;
const CONFLICTS: [string, string][] = [
  ['Duo', 'Solitaire'], ['Premier', 'Dernier'], ['Zombie', 'Nomade'], ['Zombie', 'Statue'], ['Statue', 'Nomade'],
  ['Hardi', 'Pusillanime'], ['Collant', 'Misanthrope'], ['Duo', 'Collant'], ['Solitaire', 'Collant'], ['Solitaire', 'Misanthrope'],
];
const groupSize = (a: DungeonAch) => {
  const c = challengeOf(a);
  if (c === 'Solitaire' || /seul|solitaire/i.test(a.desc)) return 1;
  if (c === 'Duo') return 2;
  if (/en équipe/i.test(a.desc)) return 3; // au moins 2, on prend toute l'équipe
  return 0; // indifférent
};
function compatible(a: DungeonAch, b: DungeonAch) {
  const ca = challengeOf(a), cb = challengeOf(b);
  if (ca && cb && CONFLICTS.some(([x, y]) => (x === ca && y === cb) || (x === cb && y === ca))) return false;
  const ga = groupSize(a), gb = groupSize(b);
  return !(ga && gb && ga !== gb);
}
export interface Run { achs: DungeonAch[]; players: number }
/** Regroupe les succès restants en un minimum de passages compatibles (glouton, les plus gros points d'abord). */
export function planRuns(todo: DungeonAch[]): Run[] {
  const runs: Run[] = [];
  // Le succès « vaincre le boss » (sans challenge) se fait avec n'importe quel passage.
  const plain = todo.filter(a => !challengeOf(a));
  const chal = todo.filter(a => challengeOf(a)).sort((x, y) => groupSize(y) - groupSize(x) || y.pts - x.pts);
  for (const a of chal) {
    const r = runs.find(r => r.achs.every(b => compatible(a, b)));
    if (r) { r.achs.push(a); r.players = Math.max(r.players, groupSize(a)); } else runs.push({ achs: [a], players: groupSize(a) });
  }
  if (plain.length) { if (runs[0]) runs[0].achs.unshift(...plain); else runs.push({ achs: plain, players: 0 }); }
  return runs;
}

// ---------- Événements saisonniers (dates approximatives, elles varient chaque année) ----------
export interface SeasonEvent { cat: string; label: string; start: [number, number]; end: [number, number]; hint: string }
export const EVENTS: SeasonEvent[] = [
  { cat: 'Île de Nowel', label: 'Nowel', start: [12, 15], end: [1, 6], hint: 'généralement de mi-décembre à début janvier' },
  { cat: 'Île de Pwâk', label: 'Pwâk', start: [3, 25], end: [4, 25], hint: 'généralement autour de Pâques' },
  { cat: 'Archipel de Vulkania', label: 'Vulkania', start: [7, 10], end: [8, 31], hint: 'généralement l’été' },
  { cat: 'Halouine', label: 'Halouine', start: [10, 20], end: [11, 5], hint: 'généralement fin octobre' },
];
/** Jours avant la date d'ouverture habituelle (0 si on est dans la période). */
export function daysUntil(e: SeasonEvent, now = new Date()) {
  const y = now.getFullYear(); const day = 864e5;
  const t0 = new Date(y, now.getMonth(), now.getDate()).getTime();
  for (const yy of [y - 1, y, y + 1]) {
    const s = new Date(yy, e.start[0] - 1, e.start[1]).getTime();
    const en = new Date(e.end[0] < e.start[0] ? yy + 1 : yy, e.end[0] - 1, e.end[1]).getTime();
    if (t0 >= s && t0 <= en) return 0;
    if (s > t0) return Math.round((s - t0) / day);
  }
  return 999;
}

export function eventStatus(d: AchData, profileId: number, isDone: IsDone) {
  return EVENTS.map(e => {
    const cat = d.cats.find(c => c.name === e.cat);
    const list = cat ? d.list.filter(a => a.c === cat.id || d.catOf.get(a.c)?.parent === cat.id) : [];
    const left = list.filter(a => !isDone(profileId, achKey(a.id)));
    return { e, list, left, pts: left.reduce((s, a) => s + a.p, 0), days: daysUntil(e) };
  }).sort((a, b) => a.days - b.days);
}

