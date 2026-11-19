// Types d'icônes du classeur Tougli : libellé affiché et famille (pour le résumé « Ce que demande ce Dofus »).
export type IconFamily = 'combat' | 'donjon' | 'bashing' | 'special' | 'metier' | 'aide';

const T: Record<string, [string, string, IconFamily]> = {
  // id: [libellé court, libellé complet, famille]
  'combat-solo': ['⚔ solo', 'Combat solo', 'combat'],
  'combat-groupe': ['⚔ groupe', 'Combat groupe', 'combat'],
  'combat-tactique-solo': ['♟ tactique', 'Combat tactique solo', 'combat'],
  'combat-vague-solo': ['≋ vagues solo', 'Combat à vagues solo', 'combat'],
  'combat-vague-groupe': ['≋ vagues groupe', 'Combat à vagues groupe', 'combat'],
  donjon: ['⛫ donjon', 'Donjon', 'donjon'],
  'bashing-mob': ['✦ bashing', 'Bashing de monstres', 'bashing'],
  songe: ['☁ songe', 'Songe', 'special'],
  dimension: ['◈ dimension', 'Dimension', 'special'],
  anomalie: ['⚠ anomalie', 'Anomalie', 'special'],
  dalles: ['▦ dalles', 'Dalles', 'special'],
  'chasse-tresor': ['🗺 chasse', 'Chasse au trésor', 'special'],
  'horaires-stricts': ['⏱ horaires', 'Horaires stricts', 'special'],
  'besoin-sort': ['✧ sort', "Besoin d'un sort", 'special'],
  succes: ['🏆 succès', 'Nécessite un succès', 'special'],
  caracteristiques: ['★ carac.', 'Caractéristiques requises', 'special'],
  parangon: ['✪ parangon', 'Parangon', 'special'],
  kamas: ['K kamas', 'Kamas', 'special'],
  ressources: ['📦 ressources', 'Ressources', 'special'],
  'aide-personnes': ['👥 aide', 'Aide de personnes', 'aide'],
  paysan: ['🌾 paysan', 'Paysan', 'metier'], mineur: ['⛏ mineur', 'Mineur', 'metier'], forgeron: ['⚒ forgeron', 'Forgeron', 'metier'],
  alchimiste: ['⚗ alchimiste', 'Alchimiste', 'metier'], sculpteur: ['🪵 sculpteur', 'Sculpteur', 'metier'], faconneur: ['🔨 façonneur', 'Façonneur', 'metier'],
  bucheron: ['🪓 bûcheron', 'Bûcheron', 'metier'], pecheur: ['🎣 pêcheur', 'Pêcheur', 'metier'], chasseur: ['🏹 chasseur', 'Chasseur', 'metier'],
};
const CLASSES = ['Sram', 'Pandawa', 'Sadida', 'Osamodas', 'Féca', 'Eliotrope', 'Éliotrope', 'Iop', 'Cra', 'Enutrof', 'Xélor', 'Ecaflip', 'Eniripsa', 'Sacrieur', 'Roublard', 'Zobal', 'Steamer', 'Huppermage', 'Ouginak', 'Forgelance'];

export function iconInfo(type: string): { short: string; label: string; family: IconFamily } {
  if (T[type]) return { short: T[type][0], label: T[type][1], family: T[type][2] };
  const raw = type.startsWith('autre:') ? type.slice(6) : type;
  if (CLASSES.includes(raw)) return { short: '👤 ' + raw, label: 'Classe requise : ' + raw, family: 'aide' };
  return { short: '🛠 ' + raw, label: raw, family: 'metier' }; // Métier 50, Forgemage, Bricoleur…
}
