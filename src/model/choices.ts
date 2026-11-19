// Choix d'un personnage pour un Dofus (alignement, ordre, métier…), sauvegardés et synchronisés comme des coches :
// clé « choice:<dofus>:<sélecteur>:<option> » = vrai pour l'option choisie.
import { resolve, type DofusView } from './catalog';
import { toggle } from './progress';

const k = (d: string, sel: string, opt: string) => `choice:${d}:${sel}:${opt}`;

export function picksFor(d: DofusView, profileId: number, isDone: (p: number, id: string) => boolean): Record<string, string> {
  return Object.fromEntries(d.choices.map(c => [c.selector, c.options.find(o => isDone(profileId, k(d.id, c.selector, o))) ?? c.default]));
}
export function setPick(d: DofusView, profileId: number, selector: string, option: string) {
  const c = d.choices.find(x => x.selector === selector);
  if (!c) return;
  for (const o of c.options) toggle(profileId, k(d.id, selector, o), o === option);
}
export function viewFor(d: DofusView, profileId: number, isDone: (p: number, id: string) => boolean) {
  return resolve(d, picksFor(d, profileId, isDone));
}
