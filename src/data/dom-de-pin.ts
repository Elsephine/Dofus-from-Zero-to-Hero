// Dom de Pin — liste des objectifs transcrite depuis les captures d'écran de la page « Dom de Pin » du site Tougli,
// envoyées par Meriem le 19/11/2026 (source autorisée par elle pour ce Dofus uniquement).
// Complétée le 19/11/2026 avec le classeur Tougli (.xlsx) envoyé par Meriem : il contient exactement les mêmes 109 quêtes
// que les captures, donc les 8 « trous » entre captures ne cachaient aucune quête. Liens DPLN, icônes et donjons de chaque
// quête : voir dom-de-pin-tougli.ts (généré). L'ordre reste celui des captures (site) ; voir domDePinOpenPoints pour les écarts.
// Donjons : sur le site, l'encadré « donjon » s'affiche AU-DESSUS de la quête concernée ; la 1re transcription l'avait rattaché
// à la quête du dessus. Corrigé d'après le classeur (le nom du donjon y est sur la ligne de la quête).
// Les kamas de chaque quête restent à relever sur dofuspourlesnoobs.com.

export interface DomDePinDungeon {
  name?: string;            // nom du donjon si visible sur la capture
  tourDuMonde?: boolean;    // « Le donjon X est demandé dans le Tour du monde »
  captureOcre?: boolean;    // « Ce donjon est à capturer pour le Dofus Ocre »
}
export interface DomDePinItem {
  id: string;
  name: string;
  kind: 'quest' | 'achievement';
  group?: string;           // objectifs à faire en même temps (mêmes monstres/donjons/zones)
  hint?: string;            // texte d'aide affiché au-dessus de la quête
  tag?: string;             // « Chasse », « Aide »…
  dungeon?: DomDePinDungeon;
  url?: string;             // lien DPLN (classeur Tougli)
  objectives?: DomDePinObjective[];
  notes?: string[];
}
export interface DomDePinObjective { type: string; count?: number; label?: string } // type = id de iconLegend
export interface DomDePinSection { id: string; title: string; items: DomDePinItem[]; }

import { domDePinTougli } from './dom-de-pin-tougli';

const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const q = (name: string, extra: Partial<DomDePinItem> = {}): DomDePinItem => {
  const id = 'ddp-' + slug(name);
  return { id, name, kind: 'quest', ...domDePinTougli[id], ...extra };
};
const a = (name: string): DomDePinItem => ({ id: 'ddp-' + slug(name), name, kind: 'achievement' });
const dj = (name: string | undefined, o = true, tdm = !!name): DomDePinDungeon => ({ name, tourDuMonde: tdm, captureOcre: o });

// Légende des icônes, lue sur la feuille « Tougli - All Dofus » (captures envoyées par Meriem le 19/11/2026).
export const iconLegend = [
  { id: 'combat-solo', label: 'Combat solo' }, { id: 'combat-groupe', label: 'Combat groupe' },
  { id: 'combat-tactique-solo', label: 'Combat tactique solo' }, { id: 'combat-vague-solo', label: 'Combat à vague solo' },
  { id: 'combat-vague-groupe', label: 'Combat à vague groupe' }, { id: 'donjon', label: 'Donjon' },
  { id: 'bashing-mob', label: 'Bashing mob' }, { id: 'dimension', label: 'Dimension' }, { id: 'anomalie', label: 'Anomalie' },
  { id: 'horaires-stricts', label: 'Horaires stricts' }, { id: 'besoin-sort', label: "Besoin d'un sort" }, { id: 'songe', label: 'Songe' },
  { id: 'caracteristiques', label: 'Caractéristiques' }, { id: 'paysan', label: 'Paysan' }, { id: 'mineur', label: 'Mineur' },
  { id: 'alchimiste', label: 'Alchimiste' }, { id: 'forgeron', label: 'Forgeron' }, { id: 'sculpteur', label: 'Sculpteur' },
  { id: 'faconneur', label: 'Façonneur' }, { id: 'dalles', label: 'Dalles' },
] as const;
// Règles d'affichage Tougli : les quêtes sont à faire dans l'ordre affiché ; un encadré = les prendre en même temps (objectifs qui se croisent).

export const domDePinHeader = {
  name: 'Dom de Pin', level: 200,
  // Chiffres affichés par Tougli (à comparer à notre calcul DPLN, pas utilisés comme vérité).
  tougli: { totalKamas: 8540142000, questsKamas: 7540357000, achievementsKamas: 999785000, objectives: 161 },
  finalNote: "Pour la suite de ce Dofus, plus aucune quête n'est requise : il suffit de faire un donjon Grunob et de parler à quelques PNJ en ayant les 6 Dofus Primordiaux dans son inventaire.",
};

export const domDePin: DomDePinSection[] = [
  { id: 'prerequis', title: 'Prérequis', items: [
    q("L'éternelle moisson"), a('Vert émeraude'), a('Pourpre profond'), a('Bleu turquoise'), a("Noir d'ébène"), a('Blanc ivoire'),
  ] },
  { id: 'prerequis-des-prerequis', title: 'Prérequis des prérequis', items: [
    q('Ça est frugal, une fois'),
    q('Dites-le avec des fleurs'),
    q('À la croisée des mondes'),
    q('Infâme pourriture', { group: 'groupe-1' }), q('Le saule du promeneur', { group: 'groupe-1' }), q('Sous le bois de sa colère', { group: 'groupe-1' }),
    q("C'est tout simple"),
    q('Arak-haï en pagaille', { dungeon: dj('Antre de la Reine Nyée') }),
    q('Munster lève le mystère', { dungeon: dj('Domaine Ancestral') }),
    q("L'art de la langue de bois", { dungeon: dj('Clairière du Chêne Mou') }),
    q("Au nom de l'Art", { dungeon: dj('Tanukouï San', true, false) }),
    q('La jetée des enfants perdus'),
    q('Le festival de la lanterne', { dungeon: dj("Fabrique de foux d'artifice") }),
    q("L'équilibre des forces", { dungeon: dj('Dojo du vent', true, false) }), q("Sang d'encre"), q('Maudite disparition'), q('Requiem pour un Yokai'),
    q('Si loin, si proches'), q('Jusqu\'à leur dernier soupir'), q('L\'épopée du moine pèlerin'),
    q('Main dans la main'),
    q("De l'encre spectaculaire", { hint: 'Avoir un moyen de soigner un ennemi' }), q('Deux souffles, une inspiration'), q('En ce jardin qui nous unit'), q("Barnabé dans l'espace"),
    q('Chaque chose en son temps'), q('Aux frontières du réel'),
    q('Ce sera mieux avant'), q('Cauchemars prémonitoires'), q('Partie de chasse'), q('Quatre contre un'), q('Rêves translucides'),
    q('Veilleur sous surveillance'), q('La source de tous les maux'), q("Quand l'éveil n'est qu'un songe"), q('Le dernier rempart'),
    q("Par ce serment s'écrit le monde"),
    q('Une bien étrange prophétie', { hint: 'Pour voir Sylvosse : aller en [26,-32], cliquer sur la zone noire puis aller sur la map à droite' }), q('Bûcherons en détresse'), q('Voyage, voyage'), q("La porte d'Enutrosor", { tag: 'Chasse' }),
    q('Orichomania'), q("La cité de l'indicible mal"), q('Messager clandestin'), q('La voix de son maître'), q('Le maître des zaaps'),
    q('Énergie renouvelable'),
    q('Traitement de choc'), q('Le disparu de Sufokia'), q('Rendez-vous avec la mort'), q("Crise d'identité"), q('Toute possession dépossède'),
    q('Le chant du Pandamonium'), q('Le début de la fin'), q('Le poids de son regard'), q('La danse de la dissonance'), q('Descendre aux cendres'),
    q("L'accusé de la réception"), q('Les monstres aboient, la diligence casse'), q('Chachyène de vie'), q('Les sentiers de la guerre'),
    q('Les quatre volontés'), q('Prise de conscience'), q('Attention à la Bête !'), q('Le nouveau monde'), q("L'île des naufragés"),
    q('Protéger et sévir'),
    q("Le Dofus et l'alchimiste"),
    q('La raison du plus fort', { dungeon: dj('Akadémie des Gobs', false) }),
    q('Après lui, le déluge', { dungeon: dj('Grotte Hesque') }),
    q('Comme un corbac sur sa branche', { dungeon: dj('Antre de la Reine Nyée', false) }),
    q('Rester planté là', { dungeon: dj('Damadrya', true, false) }),
    q('Arrête-la si tu peux', { hint: "Prendre « Pas de fumée sans feu » et l'avancer jusqu'à pouvoir prendre « Arrête-la si tu peux »", dungeon: dj('Hell Mina', true, false) }), q('Pas de fumée sans feu'), q("Quand les esprits s'échauffent"), q("Le serment de l'ambre"),
  ] },
  { id: 'quatre-sur-six', title: 'Prérequis - Quatre sur six', items: [
    q("L'ombre et la proie"),
    q('La dernière pierre', { dungeon: dj('Grotte du Bworker') }),
    q('Les coûts du sort', { dungeon: dj('Temple du Grand Ougah') }), q('Une ombre au tableau'), q('Un remède draconien'), q('Le dragon des vents'), q('Le dragon des flammes'),
    q('Le dragon des forêts'), q('Le dragon des eaux'), q('Mississitudes'), q('Le destin de Kalisthe'),
  ] },
  { id: 'six-sur-six', title: 'Prérequis - Six sur six', items: [
    q('Dans la gueule du Dragon'), q("S'armer contre le destin", { tag: 'Aide' }), q('La fin… ou le commencement'),
  ] },
  { id: 'prologue', title: 'Prérequis - Le secret des Dofus : Prologue', items: [
    q("Au détour d'un rêve perdu"), q('Entretemps, une renaissance'), q('La bête au bois dormant'),
  ] },
  { id: 'quetes', title: 'Quêtes', items: [
    q('Dis, scierie ?'), q('Colonie de vaillance'),
    q('Dans la gueule du trankilou'),
    q('Association de fureteurs', { dungeon: dj('Refuge sylvestre') }), q('La complote des P.O.M.S'), q('Un événement inattendu'),
    q("L'île maudite"), q('Chercher un Marteau-Aigri dans une galerie d\'Ereboria'), q('La fin des maningances'),
    q('La sorcière exilée'), q('Les risques du métier'), q('La graine de la révolte'),
    q("Par l'héritage qui vous lie", { group: 'groupe-valonia' }), q('Pour que la flamme vacille', { group: 'groupe-valonia' }),
    q('Une dernière volonté'), q("L'heure des adieux"),
  ] },
];

// Points encore ouverts (à voir avec Meriem) — les 8 « trous » entre captures sont résolus : aucune quête manquante.
export const domDePinOpenPoints = [
  "Tougli (site) annonce 161 objectifs ; le site et le classeur listent 109 quêtes + 6 prérequis = 115. Écart non expliqué, sans impact sur le suivi.",
  "Ordre du début de « Prérequis des prérequis » différent entre le site (captures) et le classeur : on garde l'ordre du site.",
];
// Décisions du 19/11/2026 : « À la croisée des mondes » n'a pas de donjon (confirmé par Meriem) ; les indices « soigner un ennemi »
// et « Pour voir Sylvosse » sont recalés sur la quête du dessous, comme les donjons et l'indice d'« Arrête-la si tu peux » (confirmé par le classeur).
