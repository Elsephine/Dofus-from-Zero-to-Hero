import type { Achievement, Database, DofusEntry, Quest } from './types';
import * as syl from './sylvestre';
import * as eme from './emeraude';
import * as pou from './pourpre';
import * as tur from './turquoise';
import * as ivo from './ivoire';
import * as ebe from './ebene';
import * as ocr from './ocre';
import * as qss from './quatre-sur-six';
import * as com from './prerequis-communs';
import * as sil from './silvosse';
import * as val from './valonia';

// Règle : un fichier plus spécifique (ex. emeraude.ts) remplace l'entrée du même id posée par un fichier plus général.
const byId = <T extends { id: string }>(...lists: T[][]) => Object.fromEntries(lists.flat().map(x => [x.id, x])) as Record<string, T>;
const quests: Quest[][] = [syl.quests, com.quests, sil.quests, val.quests, eme.quests, pou.quests, tur.quests, ivo.quests, ebe.quests, ocr.quests, qss.quests];
const achievements: Achievement[][] = [syl.achievements, com.achievements, sil.achievements, val.achievements, eme.achievements, pou.achievements, tur.achievements, ivo.achievements, ebe.achievements, ocr.achievements, qss.achievements];
const dofus: DofusEntry[] = [syl.sylvestre, eme.emeraude, pou.pourpre, tur.turquoise, ivo.ivoire, ebe.ebene, ocr.ocre];

export const database: Database = { quests: byId(...quests), achievements: byId(...achievements), dofus: byId(dofus) };

