import { database as db } from '../src/data';
import { parcoursKamas } from '../src/data/kamas';
const errs: string[] = [], warns: string[] = [];
const A = Object.values(db.achievements), Q = Object.values(db.quests), D = Object.values(db.dofus);
const known = (id: string) => id in db.quests || id in db.achievements;
for (const a of A) {
  if (!/^https:\/\/www\.dofuspourlesnoobs\.com\/[\w\-%.]+\.html$/.test(a.url)) errs.push(`URL suspecte : ${a.id}`);
  for (const id of a.questIds) if (!(id in db.quests)) errs.push(`${a.id} -> quête inconnue ${id}`);
  for (const id of a.subAchievementIds ?? []) if (!(id in db.achievements)) errs.push(`${a.id} -> succès inconnu ${id}`);
  if (a.questsStatus === 'toConfirm') warns.push(`liste de quêtes à extraire : ${a.name}`);
}
for (const q of Q) {
  for (const id of q.requires ?? []) if (!known(id)) errs.push(`${q.id} -> prérequis inconnu ${id}`);
  if (q.url && !/^https:\/\/www\.dofuspourlesnoobs\.com\/[\w\-%.]+\.html$/.test(q.url)) errs.push(`URL suspecte : ${q.id}`);
}
const noLink = Q.filter(q => !q.url).length;
for (const d of D) {
  for (const id of d.achievementIds) if (!(id in db.achievements)) errs.push(`${d.id} -> succès inconnu ${id}`);
  for (const id of d.requiresDofusIds ?? []) if (!(id in db.dofus)) errs.push(`${d.id} -> Dofus requis inconnu ${id}`);
  if (d.totalKamas === null) warns.push(`kamas du parcours ${d.name} : à confirmer`);
}
console.log(`${D.length} Dofus, ${A.length} succès, ${Q.length} quêtes (${Q.length - noLink} avec lien vérifié, ${noLink} sans lien)`);
for (const d of D) {
  const k = parcoursKamas(db, d.id);
  console.log(`  ${d.name} : ${k.total.toLocaleString('fr-FR')} K vérifiés · ${k.quests} quêtes / ${k.achievements} succès · ${k.complete ? 'COMPLET' : `PARTIEL (${k.missing.filter(m => m.startsWith('quête')).length} quêtes sans kamas relevés)`}`);
}
const pend = A.filter(a => a.questsStatus === 'toConfirm');
console.log(`Succès dont les quêtes restent à extraire : ${pend.length}`);
if (process.argv.includes('--verbose')) warns.forEach(w => console.log('· à confirmer :', w));
if (errs.length) { errs.forEach(e => console.error('ERREUR', e)); process.exit(1); }
console.log('OK : aucune incohérence structurelle');
