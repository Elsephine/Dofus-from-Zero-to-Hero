import type { Achievement, DofusEntry } from './types';
import { B, questsFromNames, withLinks } from './helpers';

// Source : dofuspourlesnoobs.com/pourpre-profond.html (page ouverte le 19/11/2026 : liens, récompenses et « À prévoir » lus tels quels).
// Ordre = ordre de la liste du site. Enchaînement strict entre quêtes : non indiqué par la page, donc non affirmé.
const linked = withLinks(questsFromNames('pourpre', [
  'Le livre des Taures', 'Taures et détours', 'Le trésor de Totankama', 'Il faut battre le lait quand il est chaud',
  "Regrets d'éternailes", "L'anneau de Tot", 'Une âme en peine', 'Le pouvoir derrière le trône',
]), ['le-livre-des-taures', 'taures-et-deacutetours', 'le-treacutesor-de-totankama', 'il-faut-battre-le-lait-quand-il-est-chaud',
  'regrets-deacuteternailes', 'lanneau-de-tot', 'une-acircme-en-peine', 'le-pouvoir-derriegravere-le-trocircne']);
// Niveau recommandé / kamas lus sur les pages DPLN des quêtes (19/11/2026). « Taures et détours » (page illisible) reste à relever.
const detail: Record<string, object> = {
  'pourpre-le-livre-des-taures': { level: 110, rewardKamas: 34272, requires: ['dofus-intro-la-magicienne-des-marecages'] },
  'pourpre-le-tresor-de-totankama': { level: 130, rewardKamas: 46752, requires: ['pourpre-taures-et-detours'], note: "Prérequis aussi : « Comment perdre ses plumes » (à relier)" },
  'pourpre-il-faut-battre-le-lait-quand-il-est-chaud': { level: 130, rewardKamas: 46752, requires: ['pourpre-le-tresor-de-totankama'], note: 'Prérequis : avoir avancé Totankama jusqu\'à la discussion avec Mériana ; lancer depuis le Refuge des cent détours [-42,-17]' },
  'pourpre-regrets-d-eternailes': { level: 130, rewardKamas: 23376, requires: ['pourpre-le-tresor-de-totankama'], note: 'Prérequis : Totankama jusqu\'à parler à Mériana' },
  'pourpre-l-anneau-de-tot': { level: 130, rewardKamas: 46752, requires: ['pourpre-le-tresor-de-totankama'], note: 'Prérequis : Totankama jusqu\'à parler à Mériana' },
  'pourpre-une-ame-en-peine': { level: 130, rewardKamas: 23376, requires: ['pourpre-le-tresor-de-totankama'] },
  'pourpre-le-pouvoir-derriere-le-trone': { level: 130, rewardKamas: 46752, requires: ['pourpre-une-ame-en-peine'] },
};
export const quests = linked.map(q => ({ ...q, ...(detail[q.id] ?? {}) }));
export const achievements: Achievement[] = [{
  id: 'pourpre-profond', name: 'Pourpre profond', url: B + 'pourpre-profond.html',
  questIds: quests.map(q => q.id), rewardKamas: 19480, rewardXp: 3971945, status: 'verified', questsStatus: 'verified',
}];
export const pourpre: DofusEntry = {
  id: 'pourpre', name: 'Dofus Pourpre', url: B + 'quecirctes-du-dofus-pourpre.html', achievementIds: ['pourpre-profond'],
  prep: {
    resources: [{ name: 'Tige de Bambouto', qty: 1 }, { name: 'Tête de mort', qty: 1 }],
    dungeons: [
      { name: 'Bibliothèque du Maitre Corbac' }, { name: 'Labyrinthe du Minotoror' }, { name: 'Serre du Royalmouth' },
      { name: 'Ring du Capitaine Ekarlatte' }, { name: 'Antre du Blop Multicolore Royal' },
    ],
    fights: [{ label: 'combat (seul)', count: 3 }, { label: 'combat (groupe possible)', count: 2 }, { label: 'combat tactique (seul)', count: 1 }],
  },
  totalKamas: null, status: 'verified',
};
