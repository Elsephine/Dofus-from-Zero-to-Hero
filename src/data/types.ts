// Modèle de données From Zero to Hero — la base est la source de vérité, l'UI ne fait que la lire.
export type Status = 'verified' | 'toConfirm'; // toConfirm = à confirmer, jamais inventé

export interface Source { url: string; label: string }

export interface Quest {
  id: string;                 // slug unique et stable (clé de sauvegarde)
  name: string;
  url?: string;               // lien direct DPLN ; absent => status toConfirm
  level?: number;
  requires?: string[];        // ids de quêtes/succès prérequis
  rewardKamas?: number;       // récompense en kamas de la quête (fixe), si relevée
  note?: string;
  status: Status;
}

export interface Achievement {
  id: string;
  name: string;
  url: string;
  questIds: string[];         // quêtes (ordre logique)
  subAchievementIds?: string[];
  rewardKamas?: number;       // récompense du succès (fixe)
  rewardXp?: number;
  prep?: Partial<Prep>;       // « À prévoir » propre au succès (utile pour les succès prérequis)
  status: Status;
  questsStatus: Status;       // toConfirm tant que la liste des quêtes n'est pas extraite
}

export interface Prep {
  resources: { name: string; qty: number }[];
  dungeons: { name: string; count?: number; note?: string }[];
  fights: { label: string; count: number }[];
  other?: string[];           // métiers, trajets, kamas à prévoir, conditions particulières
}

export interface DofusEntry {
  id: string;
  name: string;
  url: string;
  achievementIds: string[];
  requiresDofusIds?: string[];
  prep: Partial<Prep>;
  totalKamas: number | null;  // null => à confirmer
  status: Status;
}

export interface Database {
  quests: Record<string, Quest>;
  achievements: Record<string, Achievement>;
  dofus: Record<string, DofusEntry>;
}
