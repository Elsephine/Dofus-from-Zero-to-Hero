import type { Achievement, DofusEntry, Quest } from './types';
const B = 'https://www.dofuspourlesnoobs.com/';
const V = 'verified' as const, C = 'toConfirm' as const;

// Source : dofuspourlesnoobs.com (pages Sylvestre, Dom de Pin, Six sur six, consultées le 19/11/2026)
export const achievements: Achievement[] = [
  { id: 'en-attendant-le-printemps', name: 'En attendant le printemps', url: B+'en-attendant-le-printemps.html',
    questIds: ['dom-de-pin', 'flovoraison', 'parler-a-silvosse'],
    subAchievementIds: ['secret-des-dofus-prologue', 'arbre-qui-cache-la-foret'],
    rewardKamas: 43980, rewardXp: 5250000, status: V, questsStatus: V },
  { id: 'secret-des-dofus-prologue', name: 'Le secret des Dofus : Prologue', url: B+'le-secret-des-dofus-prologue.html',
    questIds: [], status: V, questsStatus: C },
  { id: 'arbre-qui-cache-la-foret', name: "L'arbre qui cache la forêt", url: B+'l-arbre-qui-cache-la-foret.html',
    questIds: [], status: V, questsStatus: C },
  { id: 'six-sur-six', name: 'Six sur six', url: B+'six-sur-six.html',
    questIds: ['dans-la-gueule-du-dragon', 's-armer-contre-le-destin', 'la-fin-ou-le-commencement'],
    subAchievementIds: ['en-route-pour-l-aventure','un-citoyen-modele','mais-ou-sont-les-dofus','vert-emeraude','pourpre-profond','bleu-turquoise','la-fin-de-l-eternite','quatre-sur-six','blanc-ivoire','noir-d-ebene'],
    rewardKamas: 43980, rewardXp: 5250000, status: V, questsStatus: V },
  { id: 'en-route-pour-l-aventure', name: "En route pour l'aventure", url: B+'en-route-pour-laventure.html', questIds: [], status: V, questsStatus: C },
  { id: 'un-citoyen-modele', name: 'Un citoyen modèle', url: B+'un-citoyen-modele.html', questIds: [], status: V, questsStatus: C },
  { id: 'mais-ou-sont-les-dofus', name: 'Mais où sont les Dofus ?', url: B+'mais-ougrave-sont-les-dofus.html', questIds: [], status: V, questsStatus: C },
  { id: 'vert-emeraude', name: 'Vert émeraude', url: B+'vert-eacutemeraude.html', questIds: [], status: V, questsStatus: C },
  { id: 'pourpre-profond', name: 'Pourpre profond', url: B+'pourpre-profond.html', questIds: [], status: V, questsStatus: C },
  { id: 'bleu-turquoise', name: 'Bleu turquoise', url: B+'bleu-turquoise.html', questIds: [], status: V, questsStatus: C },
  { id: 'la-fin-de-l-eternite', name: "La fin de l'éternité", url: B+'la-fin-de-leacuteterniteacute.html', questIds: [], status: V, questsStatus: C }, // lien avec l'Ocre à confirmer
  { id: 'quatre-sur-six', name: 'Quatre sur six', url: B+'quatre-sur-six.html', questIds: [], status: V, questsStatus: C },
  { id: 'blanc-ivoire', name: 'Blanc ivoire', url: B+'blanc-ivoire.html', questIds: [], status: V, questsStatus: C },
  { id: 'noir-d-ebene', name: "Noir d'ébène", url: B+'noir-d-ebene.html', questIds: [], status: V, questsStatus: C },
  { id: 'heritage-ile-brisee', name: "L'héritage de l'île brisée (méta-succès Valonia)", url: B+'quetes-de-l-archipel-de-valonia.html',
    questIds: [], subAchievementIds: ['enfant-regardait-tomber-la-neige','clan-heteroclite','conseiller-en-patrimoine','bouquet-final'], status: V, questsStatus: C },
  { id: 'enfant-regardait-tomber-la-neige', name: "L'enfant regardait tomber la neige", url: B+'l-enfant-regardait-tomber-la-neige.html',
    questIds: ['dis-scierie','colonie-de-vaillance','dans-la-gueule-du-trankilou','association-de-fureteurs','la-complote-des-poms'], status: V, questsStatus: V },
  { id: 'clan-heteroclite', name: 'Un clan hétéroclite', url: B+'un-clan-heteroclite.html', questIds: [], status: V, questsStatus: C }, // 4 quêtes annoncées
  { id: 'conseiller-en-patrimoine', name: 'Conseiller en patrimoine', url: B+'conseiller-en-patrimoine.html', questIds: [], status: V, questsStatus: C }, // 3 quêtes annoncées
  { id: 'bouquet-final', name: 'Le bouquet final', url: B+'le-bouquet-final.html', questIds: [], status: V, questsStatus: C }, // 4 quêtes annoncées
];

const q = (id: string, name: string, slug?: string): Quest =>
  ({ id, name, url: slug ? B+slug+'.html' : undefined, status: slug ? V : C });

export const quests: Quest[] = [
  q('dom-de-pin', 'Obtenir le Dom de Pin', 'dom-de-pin'),
  q('flovoraison', 'Flovoraison', 'flovoraison'),
  q('parler-a-silvosse', 'Parler à Silvosse'), // étape finale, pas de page propre
  { ...q('dans-la-gueule-du-dragon', 'Dans la gueule du dragon', 'dans-la-gueule-du-dragon'), level: 200, rewardKamas: 105552,
    requires: ['quatre-sur-six', 'blanc-ivoire', 'noir-d-ebene'], note: 'Avoir les 6 Dofus primordiaux ; lancement en [-6,-3] ; prévoir Ecaflipus, 1 combat tactique, 2 combats solo' },
  q('s-armer-contre-le-destin', "S'armer contre le destin", 's-armer-contre-le-destin'),
  q('la-fin-ou-le-commencement', 'La fin... ou le commencement', 'la-fin-ou-le-commencement'),
  q('dis-scierie', 'Dis, scierie ?', 'dis-scierie'),
  q('colonie-de-vaillance', 'Colonie de vaillance', 'colonie-de-vaillance'),
  q('dans-la-gueule-du-trankilou', 'Dans la gueule du Trankilou', 'dans-la-gueule-du-trankilou'),
  q('association-de-fureteurs', 'Association de fureteurs', 'association-de-fureteurs'),
  q('la-complote-des-poms', 'La complote des P.O.M.S', 'la-complote-des-poms'),
];

export const sylvestre: DofusEntry = {
  id: 'sylvestre', name: 'Dofus Sylvestre', url: B+'quetes-du-dofus-sylvestre.html',
  achievementIds: ['en-attendant-le-printemps', 'six-sur-six', 'heritage-ile-brisee'], // + prérequis du Dom de Pin selon DPLN
  requiresDofusIds: ['emeraude', 'pourpre', 'turquoise', 'ocre', 'ivoire', 'ebene'],
  prep: { fights: [{ label: 'combat (seul + compagnon)', count: 1 }] }, // page « En attendant le printemps ». Le « À prévoir » plus long de la page Sylvestre concerne L'arbre qui cache la forêt : voir silvosse.ts
  totalKamas: null, // à confirmer : somme des récompenses de tout le parcours (non encore vérifiée)
  status: V,
};
