// Image d'un boss (DofusDB). Si l'image n'existe pas, on retombe sur une icône.
import { useState } from 'react';
import { Skull } from 'lucide-react';

export function BossImg({ gfx, id, size = 40, name }: { gfx?: number; id?: number; size?: number; name?: string }) {
  const urls = [gfx && `https://api.dofusdb.fr/img/monsters/${gfx}.png`, id && id !== gfx && `https://api.dofusdb.fr/img/monsters/${id}.png`].filter(Boolean) as string[];
  const [k, setK] = useState(0);
  if (k >= urls.length) return <span className="boss-img none" style={{ width: size, height: size }} aria-hidden><Skull size={size * 0.5} /></span>;
  return <img className="boss-img" src={urls[k]} alt={name ?? ''} width={size} height={size} loading="lazy" referrerPolicy="no-referrer" onError={() => setK(k + 1)} />;
}
