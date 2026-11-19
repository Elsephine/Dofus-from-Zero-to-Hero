// Dom de Pin — liste des objectifs transcrite depuis les captures d'écran de la page « Dom de Pin » du site Tougli,
// envoyées par Meriem le 19/11/2026 (source autorisée par elle pour ce Dofus uniquement).
// IMPORTANT : les captures ont des trous entre elles. Les objectifs manquants sont repérés par `gapAfter`.
// Tougli annonce 161 objectifs au total ; on en a transcrit moins : la liste est INCOMPLÈTE tant que les trous ne sont pas comblés.
// Les icônes (types de combats) ne sont pas interprétées ici : jamais de valeur déduite.
// Les liens DPLN et les kamas de chaque quête restent à relever (croisement avec dofuspourlesnoobs.com).

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
  gapAfter?: boolean;       // des objectifs ne sont pas visibles sur les captures juste après celui-ci
}
export interface DomDePinSection { id: string; title: string; items: DomDePinItem[]; }

const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const q = (name: string, extra: Partial<DomDePinItem> = {}): DomDePinItem => ({ id: 'ddp-' + slug(name), name, kind: 'quest', ...extra });
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
    q('À la croisée des mondes', { dungeon: dj(undefined) }),
    q('Infâme pourriture', { group: 'groupe-1' }), q('Le saule du promeneur', { group: 'groupe-1' }), q('Sous le bois de sa colère', { group: 'groupe-1', gapAfter: true }),
    q("C'est tout simple", { dungeon: dj('Antre de la Reine Nyée') }),
    q('Arak-haï en pagaille', { dungeon: dj('Domaine Ancestral') }),
    q('Munster lève le mystère', { dungeon: dj('Clairière du Chêne Mou') }),
    q("L'art de la langue de bois", { dungeon: dj(undefined) }),
    q("Au nom de l'Art"),
    q('La jetée des enfants perdus', { dungeon: dj("Fabrique de foux d'artifice") }),
    q('Le festival de la lanterne', { dungeon: dj(undefined) }),
    q("L'équilibre des forces"), q("Sang d'encre"), q('Maudite disparition'), q('Requiem pour un Yokai', { gapAfter: true }),
    q('Si loin, si proches'), q('Jusqu\'à leur dernier soupir'), q('L\'épopée du moine pèlerin'),
    q('Main dans la main', { hint: 'Avoir un moyen de soigner un ennemi' }),
    q("De l'encre spectaculaire"), q('Deux souffles, une inspiration'), q('En ce jardin qui nous unit'), q("Barnabé dans l'espace"),
    q('Chaque chose en son temps'), q('Aux frontières du réel', { gapAfter: true }),
    q('Ce sera mieux avant'), q('Cauchemars prémonitoires'), q('Partie de chasse'), q('Quatre contre un'), q('Rêves translucides'),
    q('Veilleur sous surveillance'), q('La source de tous les maux'), q("Quand l'éveil n'est qu'un songe"), q('Le dernier rempart'),
    q("Par ce serment s'écrit le monde", { hint: 'Pour voir Sylvosse : aller en [26,-32], cliquer sur la zone noire puis aller sur la map à droite', gapAfter: true }),
    q('Une bien étrange prophétie'), q('Bûcherons en détresse'), q('Voyage, voyage'), q("La porte d'Enutrosor", { tag: 'Chasse' }),
    q('Orichomania'), q("La cité de l'indicible mal"), q('Messager clandestin'), q('La voix de son maître'), q('Le maître des zaaps'),
    q('Énergie renouvelable', { gapAfter: true }),
    q('Traitement de choc'), q('Le disparu de Sufokia'), q('Rendez-vous avec la mort'), q("Crise d'identité"), q('Toute possession dépossède'),
    q('Le chant du Pandamonium'), q('Le début de la fin'), q('Le poids de son regard'), q('La danse de la dissonance'), q('Descendre aux cendres'),
    q("L'accusé de la réception"), q('Les monstres aboient, la diligence casse'), q('Chachyène de vie'), q('Les sentiers de la guerre'),
    q('Les quatre volontés'), q('Prise de conscience'), q('Attention à la Bête !'), q('Le nouveau monde'), q("L'île des naufragés"),
    q('Protéger et sévir', { gapAfter: true }),
    q("Le Dofus et l'alchimiste", { dungeon: dj('Akadémie des Gobs', false) }),
    q('La raison du plus fort', { dungeon: dj('Grotte Hesque') }),
    q('Après lui, le déluge', { dungeon: dj('Antre de la Reine Nyée', false) }),
    q('Comme un corbac sur sa branche', { dungeon: dj(undefined) }),
    q('Rester planté là', { hint: "Prendre « Pas de fumée sans feu » et l'avancer jusqu'à pouvoir prendre « Arrête-la si tu peux »", dungeon: dj(undefined) }),
    q('Arrête-la si tu peux'), q('Pas de fumée sans feu'), q("Quand les esprits s'échauffent"), q("Le serment de l'ambre"),
  ] },
  { id: 'quatre-sur-six', title: 'Prérequis - Quatre sur six', items: [
    q("L'ombre et la proie", { dungeon: dj('Grotte du Bworker') }),
    q('La dernière pierre', { dungeon: dj('Temple du Grand Ougah') }),
    q('Les coûts du sort'), q('Une ombre au tableau'), q('Un remède draconien'), q('Le dragon des vents'), q('Le dragon des flammes'),
    q('Le dragon des forêts'), q('Le dragon des eaux', { gapAfter: true }), q('Mississitudes'), q('Le destin de Kalisthe'),
  ] },
  { id: 'six-sur-six', title: 'Prérequis - Six sur six', items: [
    q('Dans la gueule du Dragon'), q("S'armer contre le destin", { tag: 'Aide' }), q('La fin… ou le commencement'),
  ] },
  { id: 'prologue', title: 'Prérequis - Le secret des Dofus : Prologue', items: [
    q("Au détour d'un rêve perdu"), q('Entretemps, une renaissance'), q('La bête au bois dormant', { gapAfter: false }),
  ] },
  { id: 'quetes', title: 'Quêtes', items: [
    q('Dis, scierie ?'), q('Colonie de vaillance'),
    q('Dans la gueule du trankilou', { dungeon: dj('Refuge sylvestre') }),
    q('Association de fureteurs'), q('La complote des P.O.M.S'), q('Un événement inattendu', { gapAfter: true }),
    q("L'île maudite"), q('Chercher un Marteau-Aigri dans une galerie d\'Ereboria'), q('La fin des maningances'),
    q('La sorcière exilée'), q('Les risques du métier'), q('La graine de la révolte'),
    q("Par l'héritage qui vous lie", { group: 'groupe-valonia' }), q('Pour que la flamme vacille', { group: 'groupe-valonia' }),
    q('Une dernière volonté'), q("L'heure des adieux"),
  ] },
];

// Points qui manquent sur les captures (à demander à Meriem) :
export const domDePinGaps = [
  "Entre « Sous le bois de sa colère » et « C'est tout simple »",
  "Entre « Requiem pour un Yokai » et « Si loin, si proches »",
  "Entre « Aux frontières du réel » et « Ce sera mieux avant »",
  "Entre « Par ce serment s'écrit le monde » et « Une bien étrange prophétie »",
  "Entre « Énergie renouvelable » et « Traitement de choc »",
  "Entre « Protéger et sévir » et « Le Dofus et l'alchimiste »",
  "Entre « Le dragon des eaux » et « Mississitudes »",
  "Entre « Un événement inattendu » et « L'île maudite »",
  "Le nom du donjon manquant pour les mentions « à capturer pour l'Ocre » sur plusieurs objectifs",
];
