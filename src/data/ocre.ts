import type { Achievement, DofusEntry, Quest } from './types';
import { B } from './helpers';
// Sources : dofuspourlesnoobs.com/la-fin-de-leacuteterniteacute.html ; la page d'accueil du site indique que « L'éternelle moisson » donne le Dofus Ocre.
export const quests: Quest[] = [{ id: 'eternelle-moisson', name: "L'éternelle moisson", url: B + 'leacuteternelle-moisson.html', level: 40, rewardKamas: 0, requires: [], note: "Prérequis : avoir le sort « Capture d'âmes » (quête Le voleur d'âmes) ; lancement Village de la Canopée [-55,15] ; récompense : 499 405 102 XP (niveau 200) + Dofus Ocre, aucun kamas indiqué sur la page DPLN. À prévoir : capturer un Archimonstre de chaque monstre et chaque boss de donjon (détail non relevé)", status: 'verified' }];
export const achievements: Achievement[] = [{
  id: 'la-fin-de-l-eternite', name: "La fin de l'éternité", url: B + 'la-fin-de-leacuteterniteacute.html', questIds: ['eternelle-moisson'],
  rewardKamas: 43980, rewardXp: 2625000, status: 'verified', questsStatus: 'verified',
}];
export const ocre: DofusEntry = {
  id: 'ocre', name: 'Dofus Ocre', url: B + 'leacuteternelle-moisson.html', achievementIds: ['la-fin-de-l-eternite'],
  prep: {}, // « À prévoir » à extraire depuis la page L'éternelle moisson de DPLN
  totalKamas: null, status: 'toConfirm',
};
