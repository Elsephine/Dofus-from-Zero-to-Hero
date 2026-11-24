export type World = 'sram' | 'feca' | 'elio' | 'steam';
export interface Profile { id: number; name: string; classe: string; world: World; symbol: string; image: string; /** false = compte à part : sa propre avance, mais ne compte pas dans les besoins de l'équipe (×N des métiers, récolte). */ team?: boolean }

// Ordre et id identiques à l'ancien site (profile_id 0, 1, 2). Illustrations reprises de l'ancien site (public/persos).
export const profiles: Profile[] = [
  { id: 0, name: 'Furionette', image: 'furionette.webp', classe: 'Sram', world: 'sram', symbol: '☾' },
  { id: 1, name: 'Volrod', image: 'volrod.webp', classe: 'Féca', world: 'feca', symbol: '◇' },
  { id: 2, name: 'Zepharyen', image: 'zepharyen.webp', classe: 'Éliotrope', world: 'elio', symbol: '◎' },
  { id: 3, name: 'Mysdibulles', image: 'mysdibulles.webp', classe: 'Steamer', world: 'steam', symbol: '⚙', team: false },
];

/** Personnages comptés dans les besoins de l'équipe (les comptes à part en sont exclus). */
export const teamProfiles = profiles.filter(p => p.team !== false);
