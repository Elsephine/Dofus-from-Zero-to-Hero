import type { Achievement, Quest } from './types';
import { B } from './helpers';
// Source : dofuspourlesnoobs.com — Quêtes de l'archipel de Valonia, pages des succès et des quêtes (consultées le 19/11/2026).
// Valonia = 4 succès, 16 quêtes (5 + 4 + 3 + 4) selon DPLN. status 'verified' sur une quête = lien lu sur une page DPLN.
const Q = (id: string, name: string, slug?: string, requires?: string[], note?: string): Quest =>
  ({ id, name, url: slug ? B + slug + '.html' : undefined, status: slug ? 'verified' : 'toConfirm', requires, note });

const base: Quest[] = [
  // Un clan hétéroclite
  Q('valonia-un-evenement-inattendu', 'Un événement inattendu'),
  Q('valonia-l-ile-maudite', "L'île maudite"),
  Q('valonia-chercher-un-marteau-aigri', "Chercher un Marteau-Aigri dans une galerie d'Ereboria"),
  Q('valonia-la-fin-des-maningances', 'La fin des maningances'),
  // Le bouquet final (4 quêtes lues sur la page DPLN)
  Q('valonia-les-risques-du-metier', 'Les risques du métier'),
  Q('valonia-la-sorciere-exilee', 'La sorcière exilée', 'la-sorciere-exilee', ['valonia-la-fin-des-maningances']),
  Q('valonia-pour-que-la-flamme-vacille', 'Pour que la flamme vacille', 'pour-que-la-flamme-vacille', ['valonia-la-sorciere-exilee']),
  Q('valonia-l-heure-des-adieux', "L'heure des adieux", 'l-heure-des-adieux'),
  // Conseiller en patrimoine
  Q('valonia-la-graine-de-la-revolte', 'La graine de la révolte', 'la-graine-de-la-revolte', ['valonia-la-sorciere-exilee']),
  Q('valonia-par-l-heritage-qui-vous-lie', 'Par l\'héritage qui vous lie', 'par-l-heritage-qui-vous-lie', ['valonia-la-graine-de-la-revolte']),
  Q('valonia-une-derniere-volonte', 'Une dernière volonté'),
];

// Liens, niveaux recommandés, kamas et prérequis lus sur les pages DPLN des quêtes (19/11/2026).
const slugs: Record<string, string> = {
  'valonia-un-evenement-inattendu': 'un-evenement-inattendu', 'valonia-l-ile-maudite': 'l-ile-maudite',
  'valonia-chercher-un-marteau-aigri': 'chercher-un-marteau-aigri-dans-une-galerie-d-ereboria', 'valonia-la-fin-des-maningances': 'la-fin-des-maningances',
  'valonia-les-risques-du-metier': 'les-risques-du-metier', 'valonia-une-derniere-volonte': 'une-derniere-volonte',
};
const detail: Record<string, Partial<Quest>> = {
  'valonia-un-evenement-inattendu': { level: 190, rewardKamas: 39880, note: 'Prérequis page DPLN : « Le complot des P.O.M.S. » (pas encore dans la base)' },
  'valonia-l-ile-maudite': { level: 190, rewardKamas: 79760, requires: ['valonia-un-evenement-inattendu'] },
  'valonia-chercher-un-marteau-aigri': { level: 190, rewardKamas: 39880, requires: ['valonia-l-ile-maudite'] },
  'valonia-la-fin-des-maningances': { level: 190, rewardKamas: 39880, requires: ['valonia-chercher-un-marteau-aigri'] },
  'valonia-les-risques-du-metier': { level: 200, rewardKamas: 43980, note: 'Lancement : Archipel de Valonia - Ephedrya [22,-80]' },
  'valonia-la-sorciere-exilee': { level: 200, rewardKamas: 87960 },
  'valonia-pour-que-la-flamme-vacille': { level: 200, rewardKamas: 21990 },
  'valonia-l-heure-des-adieux': { level: 200, rewardKamas: 87960, requires: ['valonia-une-derniere-volonte', 'valonia-pour-que-la-flamme-vacille'], note: 'Pour que la flamme vacille bloque une étape' },
  'valonia-la-graine-de-la-revolte': { level: 200, rewardKamas: 43980, note: 'Prérequis page DPLN : La sorcière exilée ; bloquent une étape (à vérifier) : « Ça sent le gaz », « Jusqu\'à leur dernier soupir »' },
  'valonia-par-l-heritage-qui-vous-lie': { level: 200, rewardKamas: 43980 },
  'valonia-une-derniere-volonte': { level: 200, rewardKamas: 43980, requires: ['valonia-par-l-heritage-qui-vous-lie'], note: 'Bloque une étape : « Deux souffles une inspiration »' },
};
export const quests: Quest[] = base.map(q => {
  const slug = slugs[q.id];
  return { ...q, ...(slug ? { url: B + slug + '.html', status: 'verified' as const } : {}), ...(detail[q.id] ?? {}), requires: detail[q.id]?.requires ?? q.requires };
});
export const achievements: Achievement[] = [
  { id: 'clan-heteroclite', name: 'Un clan hétéroclite', url: B + 'un-clan-heteroclite.html',
    questIds: ['valonia-un-evenement-inattendu', 'valonia-l-ile-maudite', 'valonia-chercher-un-marteau-aigri', 'valonia-la-fin-des-maningances'],
    rewardKamas: 39880, rewardXp: 2526972, status: 'verified', questsStatus: 'verified',
    prep: {
      resources: [{ name: 'Ardonite', qty: 1 }, { name: 'Bière aigrisante (ou 5 000 kamas)', qty: 10 }],
      dungeons: [{ name: 'Bastion des Marteaux-Aigris' }],
      fights: [{ label: 'combat (seul)', count: 5 }, { label: 'combat (groupe possible)', count: 5 }, { label: 'combat à vagues (groupe possible)', count: 1 }],
      other: ['Posséder le sort Flamiche'],
    } },
  { id: 'conseiller-en-patrimoine', name: 'Conseiller en patrimoine', url: B + 'conseiller-en-patrimoine.html',
    questIds: ['valonia-la-graine-de-la-revolte', 'valonia-par-l-heritage-qui-vous-lie', 'valonia-une-derniere-volonte'],
    rewardKamas: 43980, rewardXp: 2625000, status: 'verified', questsStatus: 'verified',
    prep: {
      resources: [{ name: 'Chanvre', qty: 10 }, { name: 'Sauge', qty: 10 }, { name: 'Cristal liquide', qty: 10 }, { name: 'Cristal pliable', qty: 10 }, { name: 'Élixir des Trépasseurs', qty: 1 }],
      dungeons: [{ name: "Belvédère d'Ilyzaelle" }],
      fights: [{ label: 'combat (groupe possible)', count: 5 }, { label: 'combat (seul)', count: 4 }, { label: 'combat tactique', count: 1 }, { label: 'combat à vagues (seul)', count: 1 }],
      other: ['Combats pour du drop à un taux de 2,4 %', 'Le décompte de combats de la page liste deux séries de chiffres : à confirmer'],
    } },
  { id: 'bouquet-final', name: 'Le bouquet final', url: B + 'le-bouquet-final.html',
    questIds: ['valonia-les-risques-du-metier', 'valonia-la-sorciere-exilee', 'valonia-pour-que-la-flamme-vacille', 'valonia-l-heure-des-adieux'],
    rewardKamas: 43980, rewardXp: 2625000, status: 'verified', questsStatus: 'verified',
    prep: {
      resources: [{ name: 'Belladone', qty: 7 }, { name: 'Cendrepierre', qty: 7 }, { name: 'Casque de Statulipe', qty: 1 }, { name: 'Mousse de Caméliache', qty: 1 },
        { name: 'Fleur des protecteurs', qty: 1 }, { name: 'Poing de Coquelicogne', qty: 1 }, { name: 'Liane de Soldalia', qty: 1 }, { name: "Épine d'Armuguet", qty: 1 }],
      dungeons: [{ name: 'Chambre des maléfices' }, { name: 'Caverne de Cire Momore' }],
      fights: [{ label: 'combat (groupe possible)', count: 6 }],
      other: ['Combats contre des monstres d\'une zone pour du drop à 6 %'],
    } },
  { id: 'heritage-ile-brisee', name: "L'héritage de l'île brisée (méta-succès Valonia)", url: B + 'quetes-de-l-archipel-de-valonia.html', questIds: [],
    subAchievementIds: ['enfant-regardait-tomber-la-neige', 'clan-heteroclite', 'conseiller-en-patrimoine', 'bouquet-final'], status: 'verified', questsStatus: 'verified' }, // pas de quête propre
];
