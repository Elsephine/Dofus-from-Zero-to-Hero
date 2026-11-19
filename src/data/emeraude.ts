import type { Achievement, DofusEntry, Quest } from './types';
import { withLinks } from './helpers';
const B = 'https://www.dofuspourlesnoobs.com/';
const C = 'toConfirm' as const, V = 'verified' as const;

// Source : dofuspourlesnoobs.com/vert-eacutemeraude.html et /dofus-emeraude.html (consultées le 19/11/2026).
// Les 8 quêtes et leur ordre viennent de la page Dofus Émeraude ; leurs liens individuels ne sont pas encore vérifiés.
const names = [
  'Retourner voir le Dark Vlad, toujours sans mourir', 'Qui botte le cul des Culs Bottés ?', "Le voleur d'âmes",
  "L'amour perdu de Nabur", "Naissance d'une vocation", 'Les bandits de Cania', 'Draconanthropie', 'Ultime réminiscence',
];
const slug = (s: string) => 'emeraude-' + s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const base: Quest[] = names.map((n, i) => ({
  id: slug(n), name: n, status: C, // lien direct à vérifier
  requires: i === 0 ? ['mais-ou-sont-les-dofus'] : [slug(names[i - 1])],
}));
// Liens lus sur la page DPLN « Vert émeraude » le 19/11/2026.
const linked: Quest[] = withLinks(base, ['retourner-voir-le-dark-vlad-toujours-sans-mourir', 'qui-botte-le-cul-des-culs-botteacutes', 'le-voleur-dacircmes',
  'lamour-perdu-de-nabur', 'naissance-dune-vocation', 'les-bandits-de-cania', 'draconanthropie', 'ultime-reacuteminiscence']);

// Niveau / kamas / prérequis lus sur les pages DPLN (quêtes 5, 7, 8 : extraits de recherche DPLN, version possiblement ancienne).
const detail: Record<string, Partial<Quest>> = {
  [slug(names[0])]: { level: 45, rewardKamas: 3486, requires: ['mais-ou-sont-les-dofus', 'dofus-intro-la-magicienne-des-marecages'] },
  [slug(names[1])]: { level: 50, rewardKamas: 4176 },
  [slug(names[2])]: { level: 50, rewardKamas: 15072, note: "Sort Capture d'âmes ; 5 donjons à boss : Épreuve de Draegnerys, Maison Fantôme, Village Kanniboul, Laboratoire de Brumen Tinctorias, Terrier du Wa Wabbit" },
  [slug(names[3])]: { level: 90, rewardKamas: 11856 },
  [slug(names[4])]: { level: 100, rewardKamas: 28752 },
  [slug(names[5])]: { level: 100, rewardKamas: 28752, note: '9 Primatons' },
  [slug(names[6])]: { level: 100, rewardKamas: 28752 },
  [slug(names[7])]: { level: 120, rewardKamas: 40272, note: '1 100 kamas' },
};
export const quests: Quest[] = linked.map(q => ({ ...q, ...(detail[q.id] ?? {}) }));

export const achievements: Achievement[] = [{
  id: 'vert-emeraude', name: 'Vert émeraude', url: B + 'vert-eacutemeraude.html',
  questIds: quests.map(q => q.id), rewardKamas: 16780, rewardXp: 3236436, status: V, questsStatus: V,
}];

export const emeraude: DofusEntry = {
  id: 'emeraude', name: 'Dofus Émeraude', url: B + 'dofus-emeraude.html', achievementIds: ['vert-emeraude'],
  prep: {
    resources: [
      { name: 'Plume du Kwak de Vent', qty: 10 }, { name: 'Graine de la Discorde', qty: 8 }, { name: 'Ailes de Scarafeuille Blanc', qty: 6 },
      { name: 'Résine', qty: 4 }, { name: "Pierre d'Émeraude", qty: 2 },
      { name: 'Dragodinde Rousse (sauvage)', qty: 1 }, { name: 'Dragodinde Amande (sauvage)', qty: 1 }, { name: 'Dragodinde Dorée (sauvage)', qty: 1 },
    ],
    dungeons: [{ name: 'Tanière du Meulou' }, { name: 'Épreuve de Draegnerys' }, { name: 'Maison Fantôme' }, { name: 'Village Kanniboul' }, { name: 'Laboratoire de Brumen Tinctorias' }, { name: 'Terrier du Wa Wabbit' }],
    fights: [{ label: 'combat (groupe possible)', count: 7 }, { label: 'combat (seul)', count: 4 }, { label: 'combat tactique (seul)', count: 1 }],
    other: ['Avoir le succès « Ce n\'est qu\'un prélèvement »', 'Avoir le succès « Elle a peut-être trop mangé ? »', 'Être Éleveur niveau 20 ou +', '1 100 kamas', 'Combats aléatoires'],
  },
  totalKamas: null, // à confirmer : 16 780 K = récompense du succès Vert émeraude uniquement, pas le total des quêtes
  status: V,
};
