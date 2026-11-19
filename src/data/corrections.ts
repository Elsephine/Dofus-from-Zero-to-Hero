// Corrections faites à la main sur les données du classeur Tougli (le jeu a changé depuis, ou erreur dans le classeur).
// Clé = nom de la quête ; ressources à retirer de ce que le classeur indique.
export const resourceRemovals: Record<string, string[]> = {
  // 19/11/2026, Meriem : le Dofus Pourpre a été mis à jour, la quête ne demande plus de Roses des sables (le classeur en indiquait 10 000).
  'Le tresor de totankama': ['Rose des sables'],
};
