// Étiquettes discrètes d'une quête : une petite icône par contrainte (+ nombre), le détail au survol.
import { Castle, Clock4, Cloud, Compass, Gem, Grid3x3, Hammer, Handshake, Map, Package, Skull, Sparkles, Star, Swords, TriangleAlert, Trophy, Users, Waves, Crown, Coins, User } from 'lucide-react';
import { iconInfo } from '../model/icons';

const BY_TYPE: Record<string, typeof Swords> = {
  'combat-solo': Swords, 'combat-groupe': Users, 'combat-tactique-solo': Swords, 'combat-vague-solo': Waves, 'combat-vague-groupe': Waves,
  donjon: Castle, 'bashing-mob': Skull, songe: Cloud, dimension: Compass, anomalie: TriangleAlert, dalles: Grid3x3, 'chasse-tresor': Map,
  'horaires-stricts': Clock4, 'besoin-sort': Sparkles, succes: Trophy, caracteristiques: Star, parangon: Crown, kamas: Coins, ressources: Package,
  'aide-personnes': Handshake,
};
export function tagIcon(type: string) {
  if (BY_TYPE[type]) return BY_TYPE[type];
  const f = iconInfo(type).family;
  return f === 'metier' ? Hammer : f === 'aide' ? User : Gem;
}
