import type { Achievement } from './types';
import { B, questsFromNames, withLinks } from './helpers';
// Source : dofuspourlesnoobs.com/quatre-sur-six.html (page ouverte le 19/11/2026 : liens, récompenses et « À prévoir » lus tels quels).
const linked = withLinks(questsFromNames('qss', [
  'La dernière pierre', 'Les coûts du sort', 'Une ombre au tableau', 'Un remède draconien', 'Le dragon des eaux',
  'Le dragon des vents', 'Le dragon des flammes', 'Le dragon des forêts', 'Mississitudes', 'Le destin de Kalisthe',
]), ['la-derniere-pierre', 'les-couts-du-sort', 'une-ombre-au-tableau', 'un-remede-draconien', 'le-dragon-des-eaux',
  'le-dragon-des-vents', 'le-dragon-des-flammes', 'le-dragon-des-foret', 'mississitudes', 'le-destin-de-kalisthe']);
// Niveau recommandé / kamas / prérequis lus sur les pages DPLN des quêtes (19/11/2026).
const detail: Record<string, object> = {
  'qss-la-derniere-pierre': { level: 180, rewardKamas: 86352, requires: ['eternelle-moisson'], note: 'Prérequis page DPLN : avoir terminé L\'éternelle moisson, Vert émeraude, Pourpre profond, Bleu turquoise, Ocre d\'ambre ; avoir les 4 Dofus primordiaux (Émeraude, Turquoise, Pourpre, Ocre) dans l\'inventaire' },
  'qss-les-couts-du-sort': { level: 180, rewardKamas: 86352, requires: ['qss-la-derniere-pierre'] },
  'qss-une-ombre-au-tableau': { level: 190, rewardKamas: 95712, requires: ['qss-les-couts-du-sort'], note: 'Prérequis aussi : « L\'ombre et la proie » (pas encore dans la base)' },
  'qss-un-remede-draconien': { level: 190, rewardKamas: 95712, requires: ['qss-une-ombre-au-tableau'] },
  'qss-le-dragon-des-eaux': { level: 190, rewardKamas: 95712, requires: ['qss-un-remede-draconien'], note: 'Après Un remède draconien, jusqu\'à ce que la quête demande de la faire' },
  'qss-le-dragon-des-vents': { level: 190, rewardKamas: 95712, requires: ['qss-un-remede-draconien'], note: 'Bloque une étape : « Un pendule pour guider ses pas »' },
  'qss-le-dragon-des-flammes': { level: 190, rewardKamas: 95712, requires: ['qss-un-remede-draconien'] },
  'qss-le-dragon-des-forets': { level: 190, rewardKamas: 95712, requires: ['qss-un-remede-draconien'] },
  'qss-mississitudes': { level: 200, rewardKamas: 105552, requires: ['qss-un-remede-draconien'] },
  'qss-le-destin-de-kalisthe': { level: 200, rewardKamas: 105552, requires: ['qss-mississitudes'] },
};
export const quests = linked.map(q => ({ ...q, ...(detail[q.id] ?? {}) }));
export const achievements: Achievement[] = [{
  id: 'quatre-sur-six', name: 'Quatre sur six', url: B + 'quatre-sur-six.html', questIds: quests.map(q => q.id),
  rewardKamas: 43980, rewardXp: 5250000, status: 'verified', questsStatus: 'verified',
  prep: {
    resources: [
      { name: 'Dofus Pourpre (en inventaire)', qty: 1 }, { name: 'Dofus Emeraude (en inventaire)', qty: 1 }, { name: 'Dofus Turquoise (en inventaire)', qty: 1 },
      { name: 'Dofus Ocre (en inventaire)', qty: 1 }, { name: 'Éklâme majestueuse', qty: 25 }, { name: 'Potion minérale', qty: 5 },
      { name: "Potion d'altération", qty: 5 }, { name: 'Cuir de Bouftou Royal', qty: 1 }, { name: 'Petit Chienchien Noir', qty: 1 },
      { name: 'Ticket de la Foire du Trool', qty: 2 },
    ],
    dungeons: ['Grotte du Bworker', 'Temple du Grand Ougah', "Pyramide d'Ombre", 'Antichambre des Gloursons', 'Palais de Dantinéa'].map(name => ({ name })),
    fights: [{ label: 'combat (seul)', count: 23 }, { label: 'combat (groupe possible)', count: 13 }, { label: 'combat tactique (seul)', count: 1 }],
    other: ["Des combats contre des monstres d'une zone", '600 kamas', 'Être mineur niveau 20 minimum'],
  },
}];
