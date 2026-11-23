// Transforme les données (src/data) en une liste de Dofus prête à afficher. L'interface ne lit que ce catalogue.
// - Liste et ordre des quêtes : classeur Tougli (src/data/tougli/quests.ts) ; Dom de Pin : liste corrigée (data/dom-de-pin.ts).
// - Une quête qui existe dans la base vérifiée sur Dofus pour les Noobs (src/data) reprend son id, son lien, son niveau et ses kamas.
// - Une même quête dans plusieurs Dofus a toujours la même clé : cochée une fois, comptée partout.
import { database as db } from '../data';
import { domDePin, type DomDePinDungeon, type DomDePinObjective } from '../data/dom-de-pin';
import { sheetQuests } from '../data/tougli/quests';
import { dofusInfo } from '../data/tougli/dofus-info';

export interface ItemView {
  id: string;               // clé de sauvegarde (stable)
  name: string;
  kind: 'quest' | 'achievement';
  url?: string;
  level?: number;
  kamas?: number;
  note?: string;
  notes?: string[];
  hint?: string;
  tag?: string;
  group?: string;
  dungeon?: DomDePinDungeon;
  objectives?: DomDePinObjective[];
  toConfirm?: boolean;
  variant?: { selector: string; cases: { match: string; item: ItemView | null }[]; else: ItemView | null }; // dépend d'un choix
}
export interface ChoiceView { selector: string; label: string; options: string[]; default: string }
export interface SectionView { id: string; title: string; items: ItemView[] }
export interface DofusView {
  id: string;
  name: string;
  url?: string;
  sections: SectionView[];
  kamas: { total: number; complete: boolean } | null; // kamas gagnés en récompense (valeurs relevées sur DPLN)
  itemIds: string[];        // tous les objectifs cochables, sans doublon
  choices: ChoiceView[];    // « Choix avant de commencer » (alignement, ordre, métier…)
}

export const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

// Orthographes différentes d'une même quête selon les sources.
const ALIASES: Record<string, string> = { [norm("L'eternel moisson")]: norm("L'éternelle moisson"), [norm('La complote de P.O.M.S')]: norm('La complote des P.O.M.S') };
const key = (name: string) => ALIASES[norm(name)] ?? norm(name);

const dbQuest = new Map<string, string>(), dbAch = new Map<string, string>();
for (const q of Object.values(db.quests)) dbQuest.set(key(q.name), q.id);
for (const a of Object.values(db.achievements)) dbAch.set(key(a.name), a.id);

// Une même quête (même nom) garde le même identifiant dans tous les Dofus : la cocher une fois la coche partout.
const canonical = new Map<string, string>();
/** Anciens identifiants d'une quête → identifiant commun (pour reprendre les coches déjà faites). */
export const idAliases = new Map<string, string>();
/** Quêtes renommées (nom corrigé) : ancien identifiant, pour reprendre les coches. */
const RENAMED: Record<string, string> = { transportpeucommun: 'q-transportencommun' };
const unify = (_kind: string, name: string, id: string) => {
  const k = key(name).replace(/[^a-z0-9]/g, ''); const c = canonical.get(k);
  if (RENAMED[k] && RENAMED[k] !== (c ?? id)) idAliases.set(RENAMED[k], c ?? id);
  if (!c) { canonical.set(k, id); return id; }
  if (c !== id) idAliases.set(id, c);
  return c;
};

function enrich(base: Omit<ItemView, 'id'>): ItemView {
  const r = enrichRaw(base);
  return { ...r, id: unify(base.kind, base.name, r.id) };
}
function enrichRaw(base: Omit<ItemView, 'id'>): ItemView {
  if (base.kind === 'achievement') {
    const id = dbAch.get(key(base.name));
    const a = id ? db.achievements[id] : undefined;
    return { ...base, id: id ?? 'a-' + slug(base.name), url: base.url ?? a?.url };
  }
  const id = dbQuest.get(key(base.name));
  const q = id ? db.quests[id] : undefined;
  return {
    ...base, id: id ?? 'q-' + key(base.name),
    url: q?.url ?? base.url, level: base.level ?? q?.level, kamas: q?.rewardKamas, note: q?.note,
    toConfirm: q ? q.status === 'toConfirm' && !base.url : !base.url,
  };
}

function finish(v: Omit<DofusView, 'itemIds' | 'kamas' | 'choices'> & { choices?: ChoiceView[] }): DofusView {
  const ids = new Set<string>();
  let total = 0, complete = true;
  for (const s of v.sections) for (const i of s.items) {
    if (ids.has(i.id)) continue;
    ids.add(i.id);
    if (i.kind === 'quest') { if (i.kamas === undefined) complete = false; else total += i.kamas; }
  }
  return { ...v, choices: v.choices ?? [], itemIds: [...ids], kamas: total ? { total, complete } : null };
}

export const catalog: DofusView[] = dofusInfo.flatMap((info): DofusView[] => {
  if (info.id === 'dom-de-pin') {
    return [finish({
      id: info.id, name: info.name, url: 'https://www.dofuspourlesnoobs.com/dom-de-pin.html',
      sections: domDePin.map(s => ({ id: s.id, title: s.title, items: s.items.map(({ id: _old, ...i }) => enrich(i)) })),
    })];
  }
  const sheet = sheetQuests[info.id];
  if (!sheet) return [];
  const choices: ChoiceView[] = Object.entries(sheet.choices).map(([selector, c]) => ({ selector, label: c.label, options: c.options, default: c.default ?? c.options[0] }));
  return [finish({
    id: info.id, name: info.name, url: db.dofus[info.id]?.url, choices,
    sections: sheet.sections.map((s, n) => ({
      id: `${info.id}-${n}`, title: s.title,
      items: s.items.map(i => {
        const common = { kind: 'quest' as const, objectives: i.objectives, notes: i.notes, hint: i.hint, group: i.group && `${info.id}-${n}-${i.group}` };
        const alt = (l: { name: string; url?: string } | null) => (l ? enrich({ ...common, name: l.name, url: l.url }) : null);
        const base = enrich({ ...common, name: i.name, url: i.url });
        return i.variant ? { ...base, variant: { selector: i.variant.selector, cases: i.variant.cases.map(c => ({ match: c.match, item: alt(c.item) })), else: alt(i.variant.else) } } : base;
      }),
    })),
  })];
});

// Le catalogue garde les quêtes « variantes » non résolues : toujours passer par resolve() avant d'afficher ou compter.
// Applique les choix d'un personnage : chaque quête « variante » devient la quête correspondant au choix (ou disparaît).
const cache = new Map<string, DofusView>();
export function resolve(d: DofusView, picks: Record<string, string>): DofusView {
  if (!d.choices.length) return d;
  const k = d.id + JSON.stringify(d.choices.map(c => picks[c.selector] ?? c.default));
  const hit = cache.get(k); if (hit) return hit;
  const pick = (sel: string) => picks[sel] ?? d.choices.find(c => c.selector === sel)?.default ?? '';
  const sections = d.sections.map(s => ({
    ...s, items: s.items.flatMap(i => {
      if (!i.variant) return [i];
      const v = i.variant;
      const hitCase = v.cases.find(c => new RegExp(c.match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(pick(v.selector)));
      const chosen = hitCase ? hitCase.item : v.else;
      return chosen ? [{ ...chosen, variant: v }] : [];
    }),
  }));
  const out = finish({ ...d, sections });
  cache.set(k, out);
  return out;
}
