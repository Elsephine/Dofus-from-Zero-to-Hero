// Icône d'un objet du jeu par son nom (passée par le serveur du site).
import { useResourceIcon } from '../model/resourceIcons';
export function ItemImg({ name, className }: { name: string; className?: string }) {
  const src = useResourceIcon(name);
  return src ? <img src={src} alt="" className={className} /> : null;
}
