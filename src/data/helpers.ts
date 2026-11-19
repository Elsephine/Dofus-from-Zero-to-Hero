import type { Quest } from './types';
export const B = 'https://www.dofuspourlesnoobs.com/';
export const slugify = (prefix: string, s: string) =>
  prefix + '-' + s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
// Quêtes dont on connaît le nom (page du succès) mais pas encore le lien direct : jamais d'URL inventée.
export const questsFromNames = (prefix: string, names: string[]): Quest[] =>
  names.map(n => ({ id: slugify(prefix, n), name: n, status: 'toConfirm' as const }));

// Associe chaque quête à son lien DPLN lu sur la page du succès (même ordre que les noms). Aucun lien n'est jamais déduit du nom.
export const withLinks = (quests: Quest[], slugs: (string | undefined)[]): Quest[] =>
  quests.map((q, i) => slugs[i] ? { ...q, url: B + slugs[i] + '.html', status: 'verified' as const } : q);
