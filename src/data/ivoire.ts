import type { Achievement, DofusEntry } from './types';
import { B, questsFromNames, withLinks } from './helpers';
// Source : dofuspourlesnoobs.com/blanc-ivoire.html (page ouverte le 19/11/2026 : liens, récompenses et « À prévoir » lus tels quels).
const linked = withLinks(questsFromNames('ivoire', [
  'Le dragon blanc', 'Examen de passage', 'Le pays gris', 'Casse en Enutrosor', 'Nordalie',
  'Le bonheur est dans le spray', 'Une voix de crystal', "La mort dans l'âme", 'Le guerrier noir', 'Il est temps de mourir',
]), ['le-dragon-blanc', 'examen-de-passage', 'le-pays-gris', 'casse-en-enutrosor', 'nordalie', 'le-bonheur-est-dans-le-spray',
  'une-voix-de-crystal', 'le-mort-dans-l-ame', 'le-guerrier-noir', 'il-est-temps-de-mourir']);
// Niveau recommandé / kamas / prérequis lus sur les pages DPLN des quêtes (19/11/2026). « Examen de passage » et « Le guerrier noir » : pages illisibles (erreur du site), à relever.
// Les prérequis « bloque une étape » (Malédiction !, Allumer le feu, La garde meurt mais ne se rend pas, Espionnage industriel, La chasse aux chasseurs, Son nom est Personne) ne sont pas encore dans la base : listés en note.
const detail: Record<string, object> = {
  'ivoire-le-dragon-blanc': { level: 200, rewardKamas: 105552, requires: ['dofus-intro-la-magicienne-des-marecages'] },
  'ivoire-le-pays-gris': { level: 200, rewardKamas: 26388, requires: ['ivoire-examen-de-passage'] },
  'ivoire-casse-en-enutrosor': { level: 200, rewardKamas: 105552, requires: ['ivoire-le-pays-gris'], note: 'Bloque une étape : « Espionnage industriel »' },
  'ivoire-nordalie': { level: 200, rewardKamas: 105552, requires: ['ivoire-casse-en-enutrosor'], note: 'Bloquent une étape : « Malédiction ! », « Allumer le feu », « La garde meurt mais ne se rend pas »' },
  'ivoire-le-bonheur-est-dans-le-spray': { level: 200, rewardKamas: 105552, requires: ['ivoire-nordalie'], note: 'Nordalie jusqu\'à ce que la quête soit donnée ; bloque une étape : « La chasse aux chasseurs »' },
  'ivoire-une-voix-de-crystal': { level: 200, rewardKamas: 105552, requires: ['ivoire-nordalie'], note: 'Nordalie jusqu\'à ce que la quête soit donnée ; « Son nom est Personne » en cours ou terminée' },
  'ivoire-la-mort-dans-l-ame': { level: 200, rewardKamas: 105552, requires: ['ivoire-nordalie'], note: 'Prérequis incomplet sur la page DPLN ; lancement Crevasse Perge [-76,-80]' },
  'ivoire-il-est-temps-de-mourir': { level: 200, rewardKamas: 105552, requires: ['ivoire-nordalie'], note: 'Page DPLN ambiguë sur le prérequis (lien Nordalie) : à confirmer' },
};
export const quests = linked.map(q => ({ ...q, ...(detail[q.id] ?? {}) }));
export const achievements: Achievement[] = [{
  id: 'blanc-ivoire', name: 'Blanc ivoire', url: B + 'blanc-ivoire.html', questIds: quests.map(q => q.id),
  rewardKamas: 43980, rewardXp: 5250000, status: 'verified', questsStatus: 'verified',
}];
export const ivoire: DofusEntry = {
  id: 'ivoire', name: 'Dofus Ivoire', url: B + 'quecirctes-du-dofus-ivoire.html', achievementIds: ['blanc-ivoire'],
  prep: {
    resources: [
      { name: 'Graisse Gélatineuse', qty: 50 }, { name: 'Obsidienne', qty: 15 }, { name: 'Pic du Nocturlabe', qty: 1 },
      { name: 'Peau de Crocabulia', qty: 1 }, { name: 'Corde du Fancrôme', qty: 1 }, { name: 'Moustache de Rilur', qty: 5 },
      { name: 'Perce-Neige', qty: 15 }, { name: 'Blague de Soufre', qty: 20 }, { name: 'Baguette Rikiki', qty: 1 },
    ],
    dungeons: ['Chaloeil', 'Protozorreur', 'Nidas', 'Nileza', 'Capitaine Meno', 'Katrepat', 'Sylargh'].map(name => ({ name })),
    fights: [{ label: 'combats', count: 14 }, { label: 'combat (2 joueurs max)', count: 1 }, { label: 'combat tactique', count: 1 }],
    other: ['Des combats pour drop', 'Alignement 100', 'Aller en Enutrosor', 'Aller en Ecaflipus (3 fois)', 'Aller en Srambad', '+ autres choses à venir (indiqué par le site)'],
  },
  totalKamas: null, status: 'verified',
};
