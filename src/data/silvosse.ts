import type { Achievement } from './types';
import { B, questsFromNames } from './helpers';
import type { Quest } from './types';
// Source : dofuspourlesnoobs.com (pages des succès et Quêtes de Silvosse, consultées le 19/11/2026).
// status 'verified' sur une quête = lien lu sur une page DPLN (page individuelle pas toujours ouverte).
const link = (id: string, name: string, slug?: string, note?: string): Quest => ({ id, name, url: slug ? B + slug + '.html' : undefined, status: slug ? 'verified' : 'toConfirm', note });

const base: Quest[] = [
  link('prologue-au-detour-d-un-reve-perdu', "Au détour d'un rêve perdu", 'au-detour-d-un-reve-perdu', 'déjà existante avant la 2.63'),
  link('prologue-entretemps-une-renaissance', 'Entretemps, une renaissance', 'entretemps-une-renaissance', 'déjà existante avant la 2.63'),
  link('prologue-la-bete-au-bois-dormant', 'La bête au bois dormant', 'la-bete-au-bois-dormant'),
  link('silvosse-c-est-tout-simple', "C'est tout simple", 'cest-tout-simple', 'déjà présente avant la 2.70'),
  link('silvosse-arak-hai-en-pagaille', 'Arak-haï en pagaille', 'arak-haiuml-en-pagaille'),
  link('silvosse-munster-leve-le-mystere', 'Munster lève le mystère', 'munster-legraveve-le-mystegravere'),
  link('silvosse-l-art-de-la-langue-de-bois', "L'art de la langue de bois", 'lart-de-la-langue-de-bois'),
  link('silvosse-les-derniers-d-entre-nous', "Les derniers d'entre nous", 'les-derniers-d-entre-nous'),
  link('silvosse-cultures-et-turpitudes', 'Cultures et turpitudes', 'cultures-et-turpitudes'),
  link('silvosse-protecteur', 'Qui nous protège du Protecteur ? (parties 1 et 2)', 'qui-nous-protege-du-protecteur', 'la partie 2 est sur qui-nous-protege-du-protecteur-p2.html'),
];

// Niveau / kamas / prérequis lus sur les pages DPLN des quêtes (19/11/2026). « Entretemps, une renaissance » : page non ouverte, à relever.
const detail: Record<string, Partial<Quest>> = {
  'prologue-au-detour-d-un-reve-perdu': { level: 200, rewardKamas: 52776, note: "Prérequis page DPLN : « Quand l'éveil n'est qu'un songe » et « La fin… ou le commencement » (pas encore dans la base) ; posséder les 6 Dofus primordiaux ; déjà existante avant la 2.63" },
  'prologue-la-bete-au-bois-dormant': { level: 200, rewardKamas: 52776, requires: ['prologue-entretemps-une-renaissance'], note: "Prérequis aussi : « Le serment de l'ambre » (pas encore dans la base) ; 6 Dofus primordiaux dans l'inventaire" },
  'silvosse-c-est-tout-simple': { level: 80, rewardKamas: 9880, note: 'Niveau > 79 ; déjà présente avant la 2.70' },
  'silvosse-arak-hai-en-pagaille': { level: 80, rewardKamas: 19760 },
  'silvosse-munster-leve-le-mystere': { level: 80, rewardKamas: 19760, requires: ['silvosse-arak-hai-en-pagaille'] },
  'silvosse-l-art-de-la-langue-de-bois': { level: 120, rewardKamas: 44760, requires: ['silvosse-munster-leve-le-mystere'] },
  'silvosse-les-derniers-d-entre-nous': { level: 160, rewardKamas: 71960, requires: ['silvosse-l-art-de-la-langue-de-bois'], note: 'Prérequis aussi : « Rester planté là » ; « C\'est frais, mais c\'est pas grave » bloque une étape (pas encore dans la base)' },
  'silvosse-cultures-et-turpitudes': { level: 180, rewardKamas: 87960, requires: ['silvosse-les-derniers-d-entre-nous'], note: 'Prérequis aussi : « Par ce serment s\'écrit le monde » ; « Gobstination d\'un Grobelin » bloque une étape' },
  'silvosse-protecteur': { level: 180, rewardKamas: 87960, requires: ['silvosse-cultures-et-turpitudes'], note: "Niveau > 179 ; prérequis aussi : Mort et renouveau, Un héritage tourmenté, Le givre des révélations (« Dites-le avec des fleurs » et « Pas de fumée sans feu » bloquent une étape ; « Le travail c'est la santé » non obligatoire) — pas encore dans la base" },
};
for (const q of base) Object.assign(q, detail[q.id] ?? {});
export const quests: Quest[] = base;
export const achievements: Achievement[] = [
  { id: 'secret-des-dofus-prologue', name: 'Le secret des Dofus : Prologue', url: B + 'le-secret-des-dofus-prologue.html',
    questIds: ['prologue-au-detour-d-un-reve-perdu', 'prologue-entretemps-une-renaissance', 'prologue-la-bete-au-bois-dormant'],
    rewardKamas: 43980, rewardXp: 5250000, status: 'verified', questsStatus: 'verified',
    prep: { resources: [{ name: 'Substrat de Sylve', qty: 1 }, { name: 'Enchanterelle (objet de quête)', qty: 1 }], fights: [{ label: 'combat (seul)', count: 2 }] } },
  { id: 'arbre-qui-cache-la-foret', name: "L'arbre qui cache la forêt", url: B + 'l-arbre-qui-cache-la-foret.html',
    questIds: ['silvosse-c-est-tout-simple', 'silvosse-arak-hai-en-pagaille', 'silvosse-munster-leve-le-mystere', 'silvosse-l-art-de-la-langue-de-bois',
      'silvosse-les-derniers-d-entre-nous', 'silvosse-cultures-et-turpitudes', 'silvosse-protecteur'],
    rewardKamas: 43980, rewardXp: 5250000, status: 'verified', questsStatus: 'verified',
    prep: {
      dungeons: [
        { name: 'Antre de la Reine Nyée' }, { name: 'Domaine Ancestral' }, { name: 'Clairière du Chêne Mou' },
        { name: 'Antre du Korriandre' }, { name: 'Palais du Roi Nidas', note: 'prendre la clef' },
        { name: "Bataille de l'Aurore Pourpre", note: 'prendre la clef' }, { name: 'Tour de Solar' }, { name: 'Chambre des maléfices' },
      ],
      fights: [
        { label: 'combat (seul + compagnon)', count: 6 }, { label: 'combat (seul)', count: 1 },
        { label: 'combat (groupe possible)', count: 5 }, { label: 'combat à vagues (seul + compagnon)', count: 3 },
        { label: 'combat à vagues (seul)', count: 1 }, { label: 'combat (seul + compagnon Masse possible)', count: 1 },
      ],
      resources: [
        { name: 'Pépite', qty: 500 }, { name: 'Ailes de Moskito', qty: 31 }, { name: 'Métronome du Début-Temps (ou Orichor)', qty: 24 },
        { name: 'Poudre de Perlinpainpain', qty: 12 }, { name: 'Capsule Explosive', qty: 12 }, { name: "Poudre d'Artifice", qty: 12 },
        { name: 'Goulobule rouge', qty: 12 }, { name: "Glande d'Arak-haï", qty: 6 }, { name: 'Citron', qty: 6 },
        { name: 'Fil de Néfileuse', qty: 6 }, { name: 'Résine', qty: 6 }, { name: 'Kouartz', qty: 6 },
        { name: 'Écaille de Torkélonia', qty: 4 }, { name: 'Cheveux de Tal Kasha', qty: 4 }, { name: 'Tourmaline', qty: 4 },
        { name: 'Œil de Cycloïde', qty: 4 }, { name: 'Huile de Koode', qty: 3 }, { name: 'Queue de Mantaze', qty: 2 },
        { name: "Fragment d'anomalie", qty: 2 }, { name: 'Ardonite', qty: 2 }, { name: 'Galet Solaire', qty: 2 },
        { name: 'Jus de cawotte fwelaté (ou 100 000 kamas)', qty: 1 }, { name: 'Élixir des Trépasseurs', qty: 1 },
        { name: 'Galet Lunaire', qty: 1 }, { name: 'Substrat de Forêt vierge', qty: 1 },
        { name: 'Clef de la Clairière du Chêne Mou', qty: 1 }, { name: 'Dague de Will Killson (ou 20 Kama de glace)', qty: 1 },
        { name: 'Essence de Sylvesprit', qty: 1 },
      ],
      other: ['Liste reprise de la page Quêtes du Dofus Sylvestre : certains éléments peuvent concerner Flovoraison, à confirmer',
        'Combats contre des monstres d\'une zone pour du drop à 100 %', 'Essence de Sylvesprit = 20 Eau calme + 4 Volve de Fistulor + 4 Lamelle de Dramanite + 4 Lamelle de Mérulette + 4 Volve de Fongeur + 4 Écorce d\'Abrazif'],
    } },
];
