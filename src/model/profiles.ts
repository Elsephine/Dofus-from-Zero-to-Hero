export type World = 'sram' | 'feca' | 'elio';
export interface Profile { id: 0 | 1 | 2; name: string; classe: string; world: World; symbol: string; image: string }

// Ordre et id identiques à l'ancien site (profile_id 0, 1, 2). Illustrations reprises de l'ancien site (public/persos).
export const profiles: Profile[] = [
  { id: 0, name: 'Furionette', image: 'furionette.webp', classe: 'Sram', world: 'sram', symbol: '☾' },
  { id: 1, name: 'Volrod', image: 'volrod.webp', classe: 'Féca', world: 'feca', symbol: '◇' },
  { id: 2, name: 'Zepharyen', image: 'zepharyen.webp', classe: 'Éliotrope', world: 'elio', symbol: '◎' },
];
