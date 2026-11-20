// Onglet Quêtes : répétables (journalières / hebdomadaires) et alignement de Bonta (100 quêtes + les 3 ordres).
import { useMemo, useState } from 'react';
import { CalendarClock, Egg, Repeat, Shield, Star } from 'lucide-react';
import { bontaOrders, bontaQuests, repeatables, QUESTS_VERSION, type BontaOrder } from './data/jeu/quetes';
import { questIds } from './model/achievements';
import { burst } from './model/celebrate';
import { post } from './model/messages';
import { profiles } from './model/profiles';
import { teamInfo, toggle } from './model/progress';
import { favKey, repKey, repTodo, resetIn } from './model/repeat';

type IsDone = (p: number, id: string) => boolean;
const avatar = (img: string) => `${import.meta.env.BASE_URL}persos/${img}`;
export const alignKey = (id: number) => `align:${id}`;
/** Une quête d'alignement est faite si elle est cochée ici, ou si la même quête est cochée dans un Dofus. */
export const alignDone = (p: number, q: { id: number; n: string }, isDone: IsDone) => isDone(p, alignKey(q.id)) || questIds(q.n).some(id => isDone(p, id));
export const orderOf = (p: number, isDone: IsDone): BontaOrder | undefined => bontaOrders.find(o => isDone(p, `myorder:${o.key}`));

/** Journal de quêtes, comme en jeu : les Dofus (quêtes principales), les répétables, l'alignement. */
export function Quests({ profileId, isDone, tab, onTab, dofusGrid }: { profileId: number; isDone: IsDone; tab: string; onTab: (t: string) => void; dofusGrid: React.ReactNode }) {
  const pick = onTab;
  const todo = repTodo(repeatables, profileId, isDone).length;
  return (
    <main className="succes quests panel">
      <div className="detail-head"><div><p className="eyebrow">Journal de quêtes</p><h2>Quêtes</h2></div></div>
      <nav className="tabs always">
        <button className={tab === 'dofus' ? 'on' : ''} onClick={() => pick('dofus')}><Egg size={15} /> Dofus</button>
        <button className={tab === 'rep' ? 'on' : ''} onClick={() => pick('rep')}><Repeat size={15} /> Répétables {todo > 0 && <span className="badge inline">{todo}</span>}</button>
        <button className={tab === 'align' ? 'on' : ''} onClick={() => pick('align')}><Shield size={15} /> Alignement Bonta</button>
      </nav>
      {tab === 'dofus' ? dofusGrid : tab === 'rep' ? <Repeatables profileId={profileId} isDone={isDone} /> : <Alignment profileId={profileId} isDone={isDone} />}
      {tab !== 'dofus' && <p className="meta small">Données du jeu Dofus Unity {QUESTS_VERSION} (données publiques dofusdude).</p>}
    </main>
  );
}

function Repeatables({ profileId, isDone }: { profileId: number; isDone: IsDone }) {
  const [all, setAll] = useState(() => !repeatables.some(q => isDone(profileId, favKey(q))));
  const favs = repeatables.filter(q => isDone(profileId, favKey(q)));
  const list = all ? repeatables : favs;
  const zones = [...new Set(list.map(q => q.z))];
  const Row = ({ q }: { q: (typeof repeatables)[number] }) => {
    const fav = isDone(profileId, favKey(q)); const done = isDone(profileId, repKey(q));
    return (
      <li className={`rep-row${done ? ' done' : ''}${fav ? ' fav' : ''}`}>
        <input type="checkbox" checked={done} onChange={e => { if (!done) burst(e.currentTarget); toggle(profileId, repKey(q)); }} title={q.f === 'j' ? 'Faite aujourd’hui' : 'Faite cette semaine'} />
        <span className="rep-name"><strong>{q.n}</strong><small>niv. {q.l}+</small></span>
        <span className={`rep-freq ${q.f}`}>{q.f === 'j' ? 'Chaque jour' : 'Chaque semaine'}</span>
        <button className={`rep-star${fav ? ' on' : ''}`} onClick={() => toggle(profileId, favKey(q))} title={fav ? 'Je ne la fais plus' : 'Je la fais : me la rappeler'}><Star size={16} /></button>
      </li>
    );
  };
  return (
    <section className="rep">
      <div className="rep-intro">
        <CalendarClock size={18} />
        <span>Mets une <Star size={13} className="inline-star" /> aux quêtes que tu fais : elles seront rappelées sur l’accueil tant qu’elles ne sont pas faites. Remise à zéro dans <b>{resetIn('j')}</b> (journalières) et <b>{resetIn('h')}</b> (hebdomadaires), heure de Paris.</span>
      </div>
      <div className="seg rep-seg">
        <button className={!all ? 'on' : ''} onClick={() => setAll(false)}><Star size={14} /> Mes quêtes ({favs.length})</button>
        <button className={all ? 'on' : ''} onClick={() => setAll(true)}>Toutes ({repeatables.length})</button>
      </div>
      {!list.length && <p className="meta">Aucune favorite pour l’instant : passe sur « Toutes » et mets une étoile à celles que tu fais.</p>}
      {zones.map(z => (
        <div key={z}>
          <h3 className="ach-gh"><span>{z}</span><small>{list.filter(q => q.z === z).length}</small></h3>
          <ul className="ach-rows">{list.filter(q => q.z === z).map(q => <Row key={q.id} q={q} />)}</ul>
        </div>
      ))}
    </section>
  );
}

function Alignment({ profileId, isDone }: { profileId: number; isDone: IsDone }) {
  const { team } = teamInfo();
  const members = profiles.filter(p => p.id === profileId || team[p.id]);
  const me = profiles.find(p => p.id === profileId)!;
  const mine = orderOf(profileId, isDone);
  const [hideDone, setHideDone] = useState(true);
  const count = (p: number) => bontaQuests.filter(q => alignDone(p, q, isDone)).length;
  const choose = (o: BontaOrder) => {
    for (const x of bontaOrders) if (x.key !== o.key && isDone(profileId, `myorder:${x.key}`)) toggle(profileId, `myorder:${x.key}`, false);
    if (!isDone(profileId, `myorder:${o.key}`)) { toggle(profileId, `myorder:${o.key}`, true); void post('text', `${me.name} a rejoint l’${o.name} (disciple de ${o.god}) 🛡️`); }
  };
  const tranches = useMemo(() => [1, 21, 41, 61, 81].map(s => ({ s, e: s + 19, list: bontaQuests.filter(q => q.a >= s && q.a <= s + 19) })), []);
  return (
    <section className="align">
      <div className="align-team">{members.map(m => {
        const o = orderOf(m.id, isDone); const n = count(m.id);
        return (
          <div key={m.id} className={`align-card${m.id === profileId ? ' me' : ''}`} data-order={o?.key ?? 'none'}>
            <img src={avatar(m.image)} alt="" />
            <span><strong>{m.name}</strong><small>{o ? o.name : 'Ordre pas encore choisi'}</small></span>
            <b>{n}/100</b>
          </div>
        );
      })}</div>
      <h3 className="ach-gh"><span>Mon ordre</span></h3>
      <div className="orders">{bontaOrders.map(o => (
        <button key={o.key} className={`order-card${mine?.key === o.key ? ' on' : ''}`} data-order={o.key} onClick={() => choose(o)}>
          <strong>{o.name}</strong><small>Disciple de {o.god}</small>
          {mine?.key === o.key && <span className="chip">Mon ordre ✓</span>}
        </button>
      ))}</div>
      {mine && (
        <>
          <h3 className="ach-gh"><span>Rangs de l’{mine.name}</span></h3>
          <ul className="ach-rows">{mine.steps.map(st => {
            const d = alignDone(profileId, st, isDone);
            return (
              <li key={st.id} className={`rep-row${d ? ' done' : ''}`}>
                <input type="checkbox" checked={d} onChange={e => { if (!d) burst(e.currentTarget, true); toggle(profileId, alignKey(st.id)); }} />
                <span className="rep-name"><strong>{st.rank}</strong><small>alignement {st.a}+ · niv. {st.l}+</small></span>
              </li>
            );
          })}</ul>
        </>
      )}
      <div className="row align-tools">
        <label className="toggle"><input type="checkbox" checked={hideDone} onChange={e => setHideDone(e.target.checked)} /> Masquer les quêtes faites</label>
      </div>
      {tranches.map(t => {
        const list = hideDone ? t.list.filter(q => !alignDone(profileId, q, isDone)) : t.list;
        const d = t.list.filter(q => alignDone(profileId, q, isDone)).length;
        if (!list.length && hideDone) return null;
        return (
          <div key={t.s}>
            <h3 className="ach-gh"><span>Quêtes {t.s} à {t.e}</span><small>{d}/{t.list.length}</small></h3>
            <ul className="ach-rows">{list.map(q => {
              const dn = alignDone(profileId, q, isDone);
              return (
                <li key={q.id} className={`rep-row${dn ? ' done' : ''}`}>
                  <input type="checkbox" checked={dn} onChange={e => { if (!dn) burst(e.currentTarget); toggle(profileId, alignKey(q.id)); }} />
                  <span className="align-num">{q.a}</span>
                  <span className="rep-name"><strong>{q.n}</strong><small>niv. {q.l}+</small></span>
                  <span className="who">{members.filter(m => m.id !== profileId).map(m => <img key={m.id} src={avatar(m.image)} alt={m.name} className={alignDone(m.id, q, isDone) ? 'ok' : 'no'} title={`${m.name} : ${alignDone(m.id, q, isDone) ? 'faite' : 'pas encore'}`} />)}</span>
                </li>
              );
            })}</ul>
          </div>
        );
      })}
    </section>
  );
}
