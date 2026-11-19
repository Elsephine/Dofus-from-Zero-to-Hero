import type { Achievement, Quest } from './types';
import { B, questsFromNames, withLinks } from './helpers';
// Succès prérequis communs à tous les primordiaux. Source : dofuspourlesnoobs.com (pages des succès, consultées le 19/11/2026).
export const quests: Quest[] = [
  ...questsFromNames('astrub', ["Les principes d'Archie m'aident", 'On marche sur des oeufs', 'Conseil de classe', 'Quête de classe', 'Ça sent le gaz', 'Balade en forêt']),
  // Liens lus sur la page DPLN « En route pour l'aventure » (19/11/2026).
  ...withLinks(questsFromNames('incarnam', ['Réponses à tout', 'Le village dans les nuages', 'Espoirs et tragédies', 'Dans la gueule du Milimilou', 'Destination Astrub']),
    ['reacuteponses-agrave-tout', 'le-village-dans-les-nuages', 'espoirs-et-trageacutedies', 'dans-la-gueule-du-milimilou', 'destination-astrub']),
  // Liens lus sur la page DPLN « Mais où sont les Dofus ? » (19/11/2026).
  ...withLinks(questsFromNames('dofus-intro', ['Le réceptacle des Dofus', 'Un sage parmi les sages', 'Protection divine', 'Voir le Dark Vlad et mourir... ou pas', 'La magicienne des marécages']),
    ['le-receptacle-des-dofus', 'un-sage-parmi-les-sages', 'protection-divine', 'voir-le-dark-vlad-et-mourir-ou-pas', 'la-magicienne-des-mareacutecages']),
  // Prérequis hors succès, lus sur la page de la quête « Le réceptacle des Dofus ».
  { id: 'le-reveil-de-pandala', name: 'Le réveil de Pandala', url: B + 'le-reveil-de-pandala.html', status: 'verified',
    note: 'Prérequis de « Le réceptacle des Dofus » (bloque une étape) ; récompenses non relevées' } as Quest,
];
const ids = (prefix: string) => quests.filter(q => q.id.startsWith(prefix + '-')).map(q => q.id);

// Détails lus sur la page de chaque quête (récompense en kamas, prérequis). Seules les quêtes dont la page a été ouverte figurent ici.
const detail: Record<string, Partial<Quest>> = {
  'dofus-intro-le-receptacle-des-dofus': { level: 30, rewardKamas: 1776, requires: ['astrub-balade-en-foret', 'le-reveil-de-pandala'] },
  'dofus-intro-un-sage-parmi-les-sages': { level: 40, rewardKamas: 2856, requires: ['dofus-intro-le-receptacle-des-dofus'], note: 'Bloque une étape : « Intrusion chez les wabbits »' },
  'dofus-intro-protection-divine': { level: 40, rewardKamas: 1428, requires: ['dofus-intro-un-sage-parmi-les-sages'] },
  'dofus-intro-voir-le-dark-vlad-et-mourir-ou-pas': { level: 40, rewardKamas: 2856, requires: ['dofus-intro-protection-divine'], note: 'Bloque une étape : « Un pendule pour guider ses pas »' },
  'dofus-intro-la-magicienne-des-marecages': { level: 40, rewardKamas: 1428, requires: ['dofus-intro-voir-le-dark-vlad-et-mourir-ou-pas'] },
  'incarnam-reponses-a-tout': { level: 1, rewardKamas: 12, note: 'Prérequis page DPLN : « Sous le regard des dieux » (pas encore dans la base)' },
  'incarnam-le-village-dans-les-nuages': { level: 3, rewardKamas: 14, requires: ['incarnam-reponses-a-tout'] },
  'incarnam-espoirs-et-tragedies': { level: 5, rewardKamas: 63, requires: ['incarnam-le-village-dans-les-nuages'] },
  'incarnam-dans-la-gueule-du-milimilou': { level: 8, rewardKamas: 122, requires: ['incarnam-espoirs-et-tragedies'] },
  'incarnam-destination-astrub': { level: 10, rewardKamas: 84, requires: ['incarnam-dans-la-gueule-du-milimilou'] },
  'astrub-on-marche-sur-des-oeufs': { level: 15, rewardKamas: 303, requires: ['astrub-les-principes-d-archie-m-aident'], url: B + 'on-marche-sur-des-oeufs.html', status: 'verified' },
  'astrub-ca-sent-le-gaz': { level: 25, rewardKamas: 1326, requires: ['astrub-quete-de-classe'], url: B + 'ca-sent-le-gaz.html', status: 'verified' },
  'astrub-balade-en-foret': { level: 30, rewardKamas: 888, requires: ['astrub-ca-sent-le-gaz'], url: B + 'balade-en-foret.html', status: 'verified' },
};
for (const q of quests) Object.assign(q, detail[q.id] ?? {});

export const achievements: Achievement[] = [
  { id: 'un-citoyen-modele', name: 'Un citoyen modèle', url: B + 'un-citoyen-modele.html', questIds: ids('astrub'),
    rewardKamas: 2380, rewardXp: 254268, status: 'verified', questsStatus: 'verified',
    prep: { fights: [{ label: 'combat (groupe possible)', count: 3 }, { label: 'combat (seul)', count: 1 }], other: ['40 kamas'] } },
  { id: 'en-route-pour-l-aventure', name: "En route pour l'aventure", url: B + 'en-route-pour-laventure.html', questIds: ids('incarnam'),
    rewardKamas: 280, rewardXp: 23168, status: 'verified', questsStatus: 'verified',
    prep: { fights: [{ label: 'combat (seul)', count: 4 }, { label: 'combat (seul), évitable', count: 1 }] } },
  { id: 'mais-ou-sont-les-dofus', name: 'Mais où sont les Dofus ?', url: B + 'mais-ougrave-sont-les-dofus.html', questIds: ids('dofus-intro'),
    rewardKamas: 2380, rewardXp: 254268, status: 'verified', questsStatus: 'verified',
    // Ces quêtes remplacent les anciennes quêtes de Pandala depuis la 2.56 : à refaire même si le succès était déjà validé (indication DPLN).
    prep: { fights: [{ label: 'combat (seul)', count: 4 }, { label: 'combat (groupe possible)', count: 2 }, { label: 'combat à vagues (seul)', count: 1 }], other: ['500 kamas'] } },
];
