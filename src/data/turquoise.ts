import type { Achievement, DofusEntry } from './types';
import { B, questsFromNames, withLinks } from './helpers';

// Source : dofuspourlesnoobs.com/bleu-turquoise.html (page ouverte le 19/11/2026 : liste complète, telle qu'affichée par le site).
// Certaines lignes apparaissent deux fois sur la page (Kouartz, Kriptonite, Chaussette trouée de Dramak) : recopiées telles quelles.
const linked = withLinks(questsFromNames('turquoise', [
  'Plongeon et dragon', 'Extinction des feux', 'On dirait le Sud', "La méchante sorcière de l'Est", 'Autel du Nord',
  "Il était une foi dans l'Ouest", 'La bénédiction de Viti', 'La bénédiction de Thomahon', 'La bénédiction de Foluk', 'Une âme en colère',
]), ['plongeon-et-dragon', 'extinction-des-feux', 'on-dirait-le-sud', 'la-meacutechante-sorciegravere-de-lest', 'autel-du-nord',
  'il-eacutetait-une-foi-dans-louest', 'la-beacuteneacutediction-de-viti', 'la-beacuteneacutediction-de-thomahon', 'la-beacuteneacutediction-de-foluk', 'une-acircme-en-colegravere']);
// Niveau recommandé / kamas / prérequis lus sur les pages DPLN des quêtes (19/11/2026). « La bénédiction de Foluk » : page illisible (erreur du site), à relever.
const detail: Record<string, object> = {
  'turquoise-plongeon-et-dragon': { level: 100, rewardKamas: 53712, requires: ['dofus-intro-la-magicienne-des-marecages'], note: 'Niveau recommandé 100-140' },
  'turquoise-extinction-des-feux': { level: 140, rewardKamas: 53712, requires: ['turquoise-plongeon-et-dragon'] },
  'turquoise-on-dirait-le-sud': { level: 140, rewardKamas: 53712, requires: ['turquoise-extinction-des-feux'] },
  'turquoise-la-mechante-sorciere-de-l-est': { level: 150, rewardKamas: 61152, requires: ['turquoise-on-dirait-le-sud'] },
  'turquoise-autel-du-nord': { level: 160, rewardKamas: 69072, requires: ['turquoise-la-mechante-sorciere-de-l-est'] },
  'turquoise-il-etait-une-foi-dans-l-ouest': { level: 180, rewardKamas: 86352, requires: ['turquoise-autel-du-nord'] },
  'turquoise-la-benediction-de-viti': { level: 140, rewardKamas: 61152, requires: ['turquoise-la-mechante-sorciere-de-l-est'], note: "Prérequis : « La méchante sorcière de l'Est » jusqu'à rencontrer le Disciple de Viti ; niveau recommandé 140-150" },
  'turquoise-la-benediction-de-thomahon': { level: 150, rewardKamas: 69072, requires: ['turquoise-autel-du-nord'], note: "Prérequis : « Autel du Nord » jusqu'à rencontrer le Disciple de Thomahon ; niveau recommandé 150-160" },
  'turquoise-une-ame-en-colere': { level: 180, rewardKamas: 86352, requires: ['turquoise-il-etait-une-foi-dans-l-ouest'] },
};
export const quests = linked.map(q => ({ ...q, ...(detail[q.id] ?? {}) }));
export const achievements: Achievement[] = [{
  id: 'bleu-turquoise', name: 'Bleu turquoise', url: B + 'bleu-turquoise.html',
  questIds: quests.map(q => q.id), rewardKamas: 35980, rewardXp: 4874772, status: 'verified', questsStatus: 'verified',
}];
const r = (name: string, qty: number) => ({ name, qty });
export const turquoise: DofusEntry = {
  id: 'turquoise', name: 'Dofus Turquoise', url: B + 'quecirctes-du-dofus-turquoise.html', achievementIds: ['bleu-turquoise'],
  prep: {
    resources: [
      r('Pépite', 600), r('Os de Sramouraï', 15), r('Plume de Gobvious', 10), r('Peau de Don Duss Ang', 10), r('Corne de Berserkoffre', 10),
      r('Canine de Mergranlou', 10), r('Coquille de Dragoss Charbon', 10), r('Aile de Dragodinde', 10), r("Poil de Rat d'Égoutant", 10),
      r('Fleur de Gloutoblop', 10), r('Peau de Don Dorgan', 10), r('Moustache du Mufafah', 10), r('Oreille de Rhinoféroce', 10),
      r('Duvet de Truchon', 10), r('Tronc de Kokoko', 10), r('Casque Cassé du Chafer', 10), r('Poils de Smilomouth', 10),
      r('Carpelle de Brouture', 10), r('Croupion de Truchmuche', 10), r('Calumet Zoth', 10), r('Estomac de Black Wo Wabbit', 8),
      r('Pierre de Topaze', 5), r('Substrat de Bosquet', 5), r('Kouartz', 5), r('Bakélélite', 5), r('Magnésite', 5), r('Kriptonite', 5),
      r('Kouartz', 5), r('Ebonite', 5), r('Lait de Tortue', 5), r('Substrat de Fascine', 5), r('Kriptonite', 5), r('Substrat de Fourré', 5),
      r('Coquille de Dragoss Ardoise', 3), r('Laine de Dardalaine', 3), r('Écorce de Liroye Merline', 3), r('Rotule du Disciple Zoth', 3),
      r('Aile Atrophiée de Tofu Dodu', 3), r('Corne de Dragoss Calcaire', 3), r('Corne de Rhinoféroce', 3), r('Échasse de Molette', 3),
      r('Morpion de Truchideur', 3), r('Arête géante du Shamansot', 3), r('Étoffe de Kaniglou', 1), r('Bière du Feubuk', 1),
      r('Oreille du Fu Mansot', 1), r("Talon d'achille de l'Abrakleur sombre", 1), r('Chaussette trouée de Dramak', 1), r('Peau de Moon', 1),
      r('Carapace du Mantiscore', 1), r('Carniflore', 1), r('Chaussette trouée de Dramak', 1), r('Feuille de Blop Multicolore Royal', 1),
      r('Plume du Kwakwa', 1), r('Groin de Dragon Cochon', 1), r('Laine du Royalmouth', 1), r('Pixel de Fraktale', 1),
    ],
    dungeons: [
      { name: 'Antre du Dragon Cochon' }, { name: 'Clairière du Chêne Mou' },
      { name: "Fabrique de foux d'artifice", note: 'altération Idole de Viti Roussie' },
      { name: 'Laboratoire du Tynril', note: 'altération Idole de Viti Végétale' },
      { name: 'Excavation du Mansot Royal', note: 'altération Idole de Viti Glacée' },
      { name: 'Repaire de Sphincter Cell', note: 'altération Idole de Thomahon Nauséabonde' },
      { name: 'Epave du Grolandais violent', note: 'altération Idole de Thomahon Marine' },
      { name: 'Canopée du Kimbo', note: 'altération Idole de Thomahon Arboricole' },
      { name: "Hypogée de l'Obsidiantre", note: "altération Idole de Thomahon d'Obsidienne" },
      { name: 'Galerie du Phossile', note: 'altération Idole de Foluk Dorée' },
      { name: 'Grotte de Kanigroula', note: 'altération Idole de Foluk Griffée' },
      { name: 'Antre du Korriandre', note: 'altération Idole de Foluk Féérique' },
    ],
    fights: [{ label: 'combat (seul)', count: 3 }, { label: 'combat (groupe possible)', count: 6 }, { label: 'combat tactique (seul)', count: 2 }],
    other: ['Des combats aléatoires', "Des combats contre des monstres d'une zone"],
  },
  totalKamas: null, status: 'verified',
};
