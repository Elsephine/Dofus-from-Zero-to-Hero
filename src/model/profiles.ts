export type World = 'sram' | 'feca' | 'elio';
export interface Profile { id: 0 | 1 | 2; name: string; classe: string; world: World; symbol: string }

// Ordre et id identiques à l'ancien site (profile_id 0, 1, 2).
export const profiles: Profile[] = [
  { id: 0, name: 'Furionette', classe: 'Sram', world: 'sram', symbol: '☾' },
  { id: 1, name: 'Volrod', classe: 'Féca', world: 'feca', symbol: '◇' },
  { id: 2, name: 'Zepharyen', classe: 'Éliotrope', world: 'elio', symbol: '◎' },
];
