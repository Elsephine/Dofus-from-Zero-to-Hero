// Image d'un boss (DofusDB), passée par le serveur du site. Sans image : icône crâne.
import { Skull } from 'lucide-react';
import { useBossImg } from '../model/resourceIcons';

export function BossImg({ gfx, id, size = 40, name }: { gfx?: number; id?: number; size?: number; name?: string }) {
  const ids = [gfx, id && id !== gfx ? id : undefined].filter((x): x is number => !!x);
  const src = useBossImg(ids);
  if (!src) return <span className="boss-img none" style={{ width: size, height: size }} aria-hidden><Skull size={size * 0.5} /></span>;
  return <img className="boss-img" src={src} alt={name ?? ''} width={size} height={size} />;
}
