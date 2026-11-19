// Données de donjons (succès + clés) chargées à la demande, pour alléger le premier chargement du site.
import { useEffect, useState } from 'react';
import type { Dungeon } from '../data/jeu/donjons';

export interface DungeonData { dungeons: Dungeon[]; keys: Record<number, { name: string; recipe: [string, number][] }>; dungeonFor: (label: string) => Dungeon | undefined }
let cache: DungeonData | null = null; let loading: Promise<DungeonData> | null = null;
const nrm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

export function loadDungeons() {
  if (cache) return Promise.resolve(cache);
  loading ??= Promise.all([import('../data/jeu/donjons'), import('../data/jeu/clefs')]).then(([d, k]) => {
    const idx = d.dungeons.map(x => {
      const boss = x.ach[0]?.desc.match(/Vaincre (?:le |la |les |l'|l’)?(.+?) dans son donjon/i)?.[1] ?? '';
      return { d: x, keys: [nrm(x.name), nrm(boss)].filter(s => s.length > 3) };
    });
    const dungeonFor = (label: string) => { const q = nrm(label); if (q.length < 4) return undefined; return idx.find(x => x.keys.some(y => y === q || y.includes(q) || q.includes(y)))?.d; };
    cache = { dungeons: d.dungeons, keys: k.dungeonKeys, dungeonFor };
    return cache;
  });
  return loading;
}
export function useDungeons(): DungeonData | null {
  const [d, setD] = useState(cache);
  useEffect(() => { if (!d) void loadDungeons().then(setD); }, [d]);
  return d;
}
