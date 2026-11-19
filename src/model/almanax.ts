// Almanax (Dofus Unity) : offrande, bonus et récompenses, via l'API publique Dofusdude (https://api.dofusdu.de, CORS ouvert).
// Les réponses sont gardées dans le navigateur pour rester lisibles hors ligne.
export interface AlmanaxDay {
  date: string;
  bonus: { description: string; type: { name: string; id: string } };
  reward_kamas: number;
  reward_xp?: number;
  tribute: { item: { ankama_id: number; name: string; subtype: string; image_urls: { icon: string; sd?: string; hq?: string; hd?: string } }; quantity: number };
}

const API = 'https://api.dofusdu.de/dofus3/v1/fr/almanax';
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
  const url = `${API}?range[from]=${from}&range[size]=${size - 1}&level=${level}&timezone=Europe/Paris`;
  const r = await fetch(url);
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const days = (await r.json()) as AlmanaxDay[];
  const c = readCache();
  for (const d of days) c[d.date] = d;
  writeCache(c);
  return days;
}
