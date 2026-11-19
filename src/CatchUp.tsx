// Accueil : « Jouer ensemble ». Compare ma progression à celle des coéquipiers qui la partagent,
// pour que personne ne prenne trop d'avance : quêtes et succès à rattraper, ce qu'ils doivent rattraper, prochaines quêtes à faire ensemble.
import { useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Handshake, Users } from 'lucide-react';
import { catalog, type ItemView } from './model/catalog';
import { viewFor } from './model/choices';
import { dofusInfo } from './data/tougli/dofus-info';
import { profiles } from './model/profiles';
import { teamInfo, toggle } from './model/progress';
import { achKey, useAchData } from './model/achievements';
import { burst } from './model/celebrate';
import { dungeons } from './data/jeu/donjons';

type IsDone = (p: number, id: string) => boolean;
interface Step { item: ItemView; dofus: string; image?: string | null; order: number }
const avatar = (img: string) => `${import.meta.env.BASE_URL}persos/${img}`;
const eggImg = (f?: string | null) => (f ? `${import.meta.env.BASE_URL}dofus/${f}` : undefined);
const DJ_ACH = new Map(dungeons.flatMap(d => d.ach.map(a => [a.id, { name: a.name, pts: a.pts }] as const)));

/** Toutes les étapes des Dofus, dans l'ordre, sans doublon (une même quête peut servir à plusieurs Dofus). */
function allSteps(profileId: number, isDone: IsDone): Step[] {
  const seen = new Set<string>(); const out: Step[] = []; let order = 0;
  for (const raw of catalog) {
    const v = viewFor(raw, profileId, isDone);
    const info = dofusInfo.find(d => d.id === raw.id);
    for (const s of v.sections) for (const item of s.items) {
      if (seen.has(item.id)) continue; seen.add(item.id);
      out.push({ item, dofus: raw.name, image: info?.image, order: order++ });
    }
  }
  return out;
}

export function CatchUp({ profileId, isDone, onOpenDofus }: { profileId: number; isDone: IsDone; onOpenDofus: (name: string) => void }) {
  const { team } = teamInfo();
  const me = profiles.find(p => p.id === profileId)!;
  const mates = profiles.filter(p => p.id !== profileId && team[p.id]);
  const [mateId, setMateId] = useState<number | null>(null);
  const ach = useAchData();
  const steps = useMemo(() => allSteps(profileId, isDone), [profileId, isDone]);

  if (!mates.length) {
    const missing = profiles.filter(p => p.id !== profileId).map(p => p.name).join(' et ');
    return (
      <section className="catchup empty-cu">
        <h3><Handshake size={18} /> Jouer ensemble</h3>
        <p className="meta">Dès que {missing} partageront leur progression (Équipe → Progression), tu verras ici les quêtes et succès à rattraper pour garder le même rythme.</p>
      </section>
    );
  }

  const mate = mates.find(m => m.id === mateId) ?? mates[0];
  const gap = (m: number) => {
    const behind = steps.filter(s => isDone(m, s.item.id) && !isDone(profileId, s.item.id));
    const ahead = steps.filter(s => isDone(profileId, s.item.id) && !isDone(m, s.item.id));
    return { behind, ahead };
  };
  const gaps = new Map(mates.map(m => [m.id, gap(m.id)]));
  const g = gaps.get(mate.id)!;
  // Succès que le coéquipier a et pas moi (tous les succès si les données sont chargées, sinon ceux de donjon).
  const achBehind = (ach ? ach.list.map(a => ({ id: a.id, name: a.n, pts: a.p })) : [...DJ_ACH].map(([id, a]) => ({ id, ...a })))
    .filter(a => isDone(mate.id, achKey(a.id)) && !isDone(profileId, achKey(a.id)));
  // À faire ensemble : prochaines étapes que personne n'a faites, dans les Dofus déjà commencés par l'un de nous.
  const everyone = [profileId, ...mates.map(m => m.id)];
  const started = new Set(steps.filter(s => everyone.some(p => isDone(p, s.item.id))).map(s => s.dofus));
  const together = steps.filter(s => started.has(s.dofus) && everyone.every(p => !isDone(p, s.item.id)));
  const byDofus = new Map<string, Step[]>();
  for (const s of together) { const l = byDofus.get(s.dofus) ?? []; if (l.length < 2) l.push(s); byDofus.set(s.dofus, l); }
  const togetherTop = [...byDofus.values()].flat().slice(0, 6);

  const level = (n: number) => (n === 0 ? 'ok' : n <= 5 ? 'low' : n <= 20 ? 'mid' : 'high');
  const Row = ({ s }: { s: Step }) => (
    <li>
      <input type="checkbox" checked={isDone(profileId, s.item.id)} onChange={e => { burst(e.currentTarget); toggle(profileId, s.item.id); }} title="Je l’ai faite" />
      {s.image && <img src={eggImg(s.image)} alt="" title={s.dofus} />}
      <span className="cu-name">{s.item.url ? <a href={s.item.url} target="_blank" rel="noreferrer">{s.item.name}</a> : s.item.name}<small onClick={() => onOpenDofus(s.dofus)}>{s.dofus}</small></span>
    </li>
  );

  return (
    <section className="catchup">
      <h3><Handshake size={18} /> Jouer ensemble <small className="meta">pour garder le même rythme</small></h3>
      <div className="cu-mates">
        {mates.map(m => {
          const x = gaps.get(m.id)!;
          return (
            <button key={m.id} className={`cu-mate${m.id === mate.id ? ' on' : ''}`} data-world={m.world} onClick={() => setMateId(m.id)}>
              <img src={avatar(me.image)} alt="" className="cu-av" />
              <span className="cu-vs">
                <span className={`cu-gap ${level(x.behind.length)}`}><ArrowDownRight size={13} /> {x.behind.length} de retard</span>
                <span className="cu-gap ahead"><ArrowUpRight size={13} /> {x.ahead.length} d’avance</span>
              </span>
              <img src={avatar(m.image)} alt="" className="cu-av" />
              <strong>{m.name}</strong>
            </button>
          );
        })}
      </div>
      <div className="cu-cols">
        <div className="cu-col">
          <h4>Pour rattraper {mate.name} <span className="chip">{g.behind.length}</span></h4>
          {g.behind.length ? <ul className="cu-list">{g.behind.slice(0, 8).map(s => <Row key={s.item.id} s={s} />)}</ul>
            : <p className="cu-ok">✓ Tu n’as aucun retard sur {mate.name} côté quêtes.</p>}
          {g.behind.length > 8 && <p className="meta small">… et {g.behind.length - 8} autres, dans l’ordre des Dofus.</p>}
          {achBehind.length > 0 && <p className="cu-ach">🏆 {achBehind.length} succès que {mate.name} a déjà : {achBehind.slice(0, 3).map(a => a.name).join(', ')}{achBehind.length > 3 ? '…' : ''}</p>}
        </div>
        <div className="cu-col">
          <h4>{mate.name} doit rattraper <span className="chip">{g.ahead.length}</span></h4>
          {g.ahead.length ? <>
            <p className="meta small">Tu as de l’avance ici : idéal pour l’accompagner ou attendre avant d’aller plus loin.</p>
            <ul className="cu-list readonly">{g.ahead.slice(0, 5).map(s => (
              <li key={s.item.id}>{s.image && <img src={eggImg(s.image)} alt="" />}<span className="cu-name">{s.item.name}<small>{s.dofus}</small></span></li>
            ))}</ul>
            {g.ahead.length > 5 && <p className="meta small">… et {g.ahead.length - 5} autres.</p>}
          </> : <p className="cu-ok">✓ Pas d’avance sur {mate.name} : vous êtes au même niveau.</p>}
        </div>
        <div className="cu-col together">
          <h4><Users size={15} /> À faire ensemble ensuite</h4>
          {togetherTop.length ? <ul className="cu-list">{togetherTop.map(s => <Row key={s.item.id} s={s} />)}</ul>
            : <p className="meta small">Commencez un Dofus et ses prochaines étapes communes s’afficheront ici.</p>}
        </div>
      </div>
    </section>
  );
}
