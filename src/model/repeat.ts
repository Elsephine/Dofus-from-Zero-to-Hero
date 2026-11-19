// Quêtes répétables : favorites (celles qu'on fait) et coche « faite » qui se remet à zéro chaque jour / chaque semaine
// (heure de Paris, comme les serveurs français).
import type { RepQuest } from '../data/jeu/quetes';

type IsDone = (p: number, id: string) => boolean;
const parisDate = (d = new Date()) => new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d); // AAAA-MM-JJ
/** Lundi de la semaine en cours (heure de Paris). */
const parisWeek = () => {
  const [y, m, d] = parisDate().split('-').map(Number); const t = new Date(Date.UTC(y, m - 1, d));
  t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 6) % 7)); return t.toISOString().slice(0, 10);
};
export const favKey = (q: { id: number }) => `repfav:${q.id}`;
export const repKey = (q: RepQuest) => `rep:${q.id}:${q.f === 'j' ? parisDate() : 'w' + parisWeek()}`;
export const repTodo = (list: RepQuest[], p: number, isDone: IsDone) => list.filter(q => isDone(p, favKey(q)) && !isDone(p, repKey(q)));
/** Temps restant avant la remise à zéro (minuit à Paris / lundi minuit). */
export function resetIn(f: 'j' | 'h') {
  const now = new Date();
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23' }).formatToParts(now).map(x => [x.type, x.value]));
  const mins = 24 * 60 - (Number(parts.hour) * 60 + Number(parts.minute));
  const dow = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(parts.weekday);
  const total = f === 'j' ? mins : (6 - dow) * 24 * 60 + mins;
  const h = Math.floor(total / 60), d = Math.floor(h / 24);
  return d ? `${d} j ${h % 24} h` : `${h} h ${String(total % 60).padStart(2, '0')}`;
}
