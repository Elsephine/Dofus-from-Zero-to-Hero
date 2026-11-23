// Almanax (Dofus Unity) : offrande, bonus et récompenses (API publique Dofusdude), demandés PAR LE SERVEUR DU SITE (RPC fzth_almanax)
// pour que votre adresse IP ne parte pas chez un site tiers.
import { codeFor, isUnlocked, rpc } from './progress';
import { profiles } from './profiles';
// Les réponses sont gardées dans le navigateur pour rester lisibles hors ligne.
export interface AlmanaxDay {
  date: string;
  bonus: { description: string; type: { name: string; id: string } };
  reward_kamas: number;
  reward_xp?: number;
  tribute: { item: { ankama_id: number; name: string; subtype: string; image_urls: { icon: string; sd?: string; hq?: string; hd?: string } }; quantity: number };
}

const LS = 'fzth:v2:almanax';

export const parisToday = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
export const addDays = (d: string, n: number) => { const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };

/** Jour avec une quête spéciale : l'API le signale par le type de bonus ou sa description (« Une quête répétable spéciale est disponible… »). */
export const hasSpecialQuest = (d: AlmanaxDay) => /qu[eê]te/i.test(d.bonus?.type?.name ?? '') || /qu[eê]te/i.test(d.bonus?.description ?? '') || /quest/i.test(d.bonus?.type?.id ?? '');

function readCache(): Record<string, AlmanaxDay> { try { return JSON.parse(localStorage.getItem(LS) ?? '{}'); } catch { return {}; } }
function writeCache(c: Record<string, AlmanaxDay>) {
  // On ne garde que les 60 derniers jours et l'avenir, pour ne pas grossir sans fin.
  const min = addDays(parisToday(), -60);
  try { localStorage.setItem(LS, JSON.stringify(Object.fromEntries(Object.entries(c).filter(([k]) => k >= min)))); } catch { /* ignore */ }
}

export function cachedRange(from: string, size: number): (AlmanaxDay | undefined)[] {
  const c = readCache();
  return Array.from({ length: size }, (_, i) => c[addDays(from, i)]);
}

export async function fetchRange(from: string, size: number, level: number): Promise<AlmanaxDay[]> {
  const p = profiles.map(x => x.id).find(isUnlocked); if (p === undefined) throw new Error('non connecté');
  const days = (await rpc<AlmanaxDay[]>('fzth_almanax', { p_profile: p, p_code: codeFor(p), p_from: from, p_size: size, p_level: level })) ?? [];
  const c = readCache();
  for (const d of days) c[d.date] = d;
  writeCache(c);
  return days;
}
