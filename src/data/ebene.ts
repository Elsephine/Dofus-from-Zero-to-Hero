import type { Achievement, DofusEntry } from './types';
import { B, questsFromNames, withLinks } from './helpers';
// Source : dofuspourlesnoobs.com/noir-d-ebene.html (page ouverte le 19/11/2026 : liens, récompenses et « À prévoir » lus tels quels).
const linked = withLinks(questsFromNames('ebene', [
  "L'épée du rocher", 'Le forgeur de légende', "Jusqu'au bout du rêve", 'À la recherche de Crocoburio', 'Le creuset de Mériana',
  'Une douloureuse séparation', 'Le dragon noir', 'La vengeance du dernier empereur', "L'oeuf de Crocabulia", 'Un nouvel héritier',
]), ['l-epee-du-rocher', 'le-forgeur-de-legende', 'jusqu-au-bout-du-reve', 'a-la-recherche-de-crocoburio', 'le-creuset-de-meriana',
  'une-douloureuse-separation', 'le-dragon-noir', 'la-vengeance-du-dernier-empereur', 'l-oeuf-de-crocabulia', 'un-nouvel-heritier']);
// Niveau requis (« Niveau > N » sur la page) / kamas / prérequis lus sur les pages DPLN des quêtes (19/11/2026).
// « Le forgeur de légende », « À la recherche de Crocoburio » et « Un nouvel héritier » : pages illisibles (erreur du site), à relever.
const detail: Record<string, object> = {
  'ebene-l-epee-du-rocher': { level: 101, rewardKamas: 40272, requires: ['mais-ou-sont-les-dofus'], note: 'Bloque une étape : « Mieux vaut ne pas se fier à la première impression »' },
  'ebene-jusqu-au-bout-du-reve': { level: 101, rewardKamas: 105552, requires: ['ebene-le-forgeur-de-legende'], note: 'Conseillé : accès aux Songes Infinis en Rêve III ou plus' },
  'ebene-le-creuset-de-meriana': { level: 190, rewardKamas: 105552, requires: ['ebene-a-la-recherche-de-crocoburio'], note: 'Bloque une étape : « Un pendule pour guider ses pas »' },
  'ebene-une-douloureuse-separation': { level: 190, rewardKamas: 105552, requires: ['ebene-le-creuset-de-meriana'] },
  'ebene-le-dragon-noir': { level: 190, rewardKamas: 105552, requires: ['ebene-une-douloureuse-separation'], note: 'Bloque une étape : « De Brikke et de Brokke »' },
  'ebene-la-vengeance-du-dernier-empereur': { level: 190, rewardKamas: 105552, requires: ['ebene-le-dragon-noir'], note: 'À prévoir : 2 combats (seul) et 20 500 kamas (dépense)' },
  'ebene-l-oeuf-de-crocabulia': { level: 190, rewardKamas: 105552, requires: ['ebene-la-vengeance-du-dernier-empereur'] },
};
export const quests = linked.map(q => ({ ...q, ...(detail[q.id] ?? {}) }));
export const achievements: Achievement[] = [{
  id: 'noir-d-ebene', name: "Noir d'ébène", url: B + 'noir-d-ebene.html', questIds: quests.map(q => q.id),
  rewardKamas: 43980, rewardXp: 5250000, status: 'verified', questsStatus: 'verified',
}];
export const ebene: DofusEntry = {
  id: 'ebene', name: 'Dofus Ébène', url: B + 'quetes-du-dofus-ebene.html', achievementIds: ['noir-d-ebene'],
  prep: {
    resources: [
      { name: 'Mesure de sel', qty: 18 }, { name: 'Poudre de Perlinpainpain', qty: 36 }, { name: 'Seigle', qty: 18 },
      { name: 'Obsidienne', qty: 10 }, { name: 'Dolomite', qty: 10 }, { name: 'Écume de mer', qty: 10 },
      { name: "Corde d'escalade", qty: 1 }, { name: 'Saucisse Fumée', qty: 10 }, { name: 'Barbarbe', qty: 5 }, { name: 'Perce-Neige', qty: 20 },
    ],
    dungeons: ['Repaire de Skeunk', 'Mégalithe de Fraktale', 'Sanctuaire des Dragoeufs', 'Tour de Bethel', 'Temple de Koutoulou',
      'Brasserie du Roi Dazak', 'Salons Privés de Klime', 'Trône de la Cour Sombre', 'Tour de Solar'].map(name => ({ name })),
    fights: [{ label: 'combat (groupe possible)', count: 14 }, { label: 'combat (seul)', count: 11 }, { label: 'combat (seul + compagnon)', count: 1 }, { label: 'combat tactique (seul)', count: 1 }],
    other: ['Des combats aléatoires', "Des combats contre des monstres d'une zone", '20 500 kamas', 'Aller en Xélorium', 'Aller à Srambad', 'Songes Infinis Rêve III ou +',
      'Croiser aléatoirement 12 fois un PNJ dans les songes (selon des paliers)', 'Être paysan niveau 80 minimum', 'Être mineur niveau 20 minimum'],
  },
  totalKamas: null, status: 'verified',
};
