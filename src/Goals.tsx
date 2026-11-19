// Objectifs de session : « Aujourd'hui on finit les derniers combats du Cauchemar », « Donjons X et Y »…
import { useMemo, useState } from 'react';
import { catalog, type ItemView } from './model/catalog';
import { viewFor } from './model/choices';
import { closeGoal, createGoal, useGoals, type Goal } from './model/goals';
import { iconInfo } from './model/icons';
import { post } from './model/messages';
import { profiles } from './model/profiles';
import { teamInfo, toggle } from './model/progress';
import { getItem } from './model/search';

type IsDone = (p: number, id: string) => boolean;
const COMBAT = /^combat-/;
const hasCombat = (i: ItemView) => (i.objectives ?? []).some(o => COMBAT.test(o.type));
const hasDungeon = (i: ItemView) => !!i.dungeon?.name || (i.objectives ?? []).some(o => o.type === 'donjon');
const isGroup = (i: ItemView) => hasDungeon(i) || (i.objectives ?? []).some(o => ['combat-groupe', 'combat-vague-groupe', 'aide-personnes'].includes(o.type));
const dayTitle = () => `Session du ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}`;

function Chips({ i }: { i: ItemView }) {
  return (
    <span className="chips">
      {i.dungeon?.name && <span className="chip f-donjon">⛫ {i.dungeon.name}</span>}
      {(i.objectives ?? []).filter(o => !(o.type === 'donjon' && i.dungeon?.name)).map((o, k) => (
        <span key={k} className="chip">{iconInfo(o.type).short}{o.count ? ` ×${o.count}` : ''}{o.label && o.type === 'donjon' ? ` · ${o.label}` : ''}</span>
      ))}
    </span>
  );
}

export function GoalCard({ g, profileId, isDone }: { g: Goal; profileId: number; isDone: IsDone }) {
  const { team } = teamInfo();
  const members = profiles.filter(p => p.id === profileId || team[p.id]);
  const items = g.item_ids.map(id => ({ id, item: getItem(id) })).filter(x => x.item) as { id: string; item: ItemView }[];
  const doneBy = (pid: number) => items.filter(x => isDone(pid, x.id)).length;
  const allDone = members.every(m => doneBy(m.id) === items.length);
  const author = profiles.find(p => p.id === g.profile_id);
  const dofus = catalog.find(c => c.id === g.dofus_id);
  return (
    <div className={`goal-card${allDone ? ' achieved' : ''}`}>
      <div className="goal-head">
        <div>
          <h3>🎯 {g.title}</h3>
          <p className="meta small">{dofus?.name} · proposé par {author?.name} · {new Date(g.created_at).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
        </div>
        <div className="goal-members">
          {members.map(m => (
            <span key={m.id} className="gm" title={m.name}>
              <img className="avatar" src={`${import.meta.env.BASE_URL}persos/${m.image}`} alt="" />
              <small>{doneBy(m.id)}/{items.length}</small>
            </span>
          ))}
        </div>
      </div>
      <ul className="goal-items">
        {items.map(({ id, item }) => (
          <li key={id} className={isDone(profileId, id) ? 'done' : ''}>
            <label><input type="checkbox" checked={isDone(profileId, id)} onChange={() => toggle(profileId, id)} />
              {item.url ? <a href={item.url} target="_blank" rel="noreferrer">{item.name}</a> : item.name}</label>
            <Chips i={item} />
            <span className="who">{members.filter(m => m.id !== profileId).map(m => <span key={m.id} className={isDone(m.id, id) ? 'ok' : 'todo'} title={m.name}>{m.name[0]}{isDone(m.id, id) ? '✓' : '·'}</span>)}</span>
          </li>
        ))}
      </ul>
      <div className="row">
        {allDone && <span className="chip quest">🎉 Objectif atteint par toute l’équipe</span>}
        <button onClick={() => { void closeGoal(g.id); if (allDone) void post('done', `Objectif « ${g.title} » atteint !`, g.id); }}>{allDone ? 'Archiver' : 'Clore l’objectif'}</button>
      </div>
    </div>
  );
}

export function Goals({ profileId, isDone }: { profileId: number; isDone: IsDone }) {
  const { open, goals, online } = useGoals();
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState(dayTitle());
  const [dofusId, setDofusId] = useState(() => { try { return JSON.parse(localStorage.getItem('fzth:v2:lastDofus') ?? '"dom-de-pin"'); } catch { return 'dom-de-pin'; } });
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [err, setErr] = useState('');
  const raw = catalog.find(c => c.id === dofusId) ?? catalog[0];
  const sections = useMemo(() => {
    const v = viewFor(raw, profileId, isDone); const seen = new Set<string>();
    return v.sections.map(s => ({ title: s.title, items: s.items.filter(i => { if (seen.has(i.id) || isDone(profileId, i.id)) return false; seen.add(i.id); return true; }) })).filter(s => s.items.length);
  }, [raw, profileId, isDone]); // eslint-disable-line react-hooks/exhaustive-deps
  const remaining = sections.flatMap(s => s.items);
  const flipSection = (items: ItemView[]) => { const n = new Set(sel); const all = items.every(i => n.has(i.id)); items.forEach(i => (all ? n.delete(i.id) : n.add(i.id))); setSel(n); };
  const pick = (f: (i: ItemView) => boolean) => setSel(new Set(remaining.filter(f).map(i => i.id)));
  const flip = (id: string) => { const n = new Set(sel); n.has(id) ? n.delete(id) : n.add(id); setSel(n); };
  const create = async () => {
    setErr('');
    if (!sel.size) return setErr('Choisis au moins une quête.');
    try {
      const ids = remaining.filter(i => sel.has(i.id)).map(i => i.id); // dans l'ordre conseillé
      await createGoal(title.trim() || dayTitle(), raw.id, ids);
      const me = profiles.find(p => p.id === profileId)!;
      void post('text', `🎯 ${me.name} propose l’objectif « ${title.trim() || dayTitle()} » : ${ids.length} quête${ids.length > 1 ? 's' : ''} du ${raw.name}`);
      setCreating(false); setSel(new Set()); setTitle(dayTitle());
    } catch { setErr('Impossible de créer l’objectif : serveur injoignable.'); }
  };
  const archived = goals.filter(g => g.closed).slice(0, 5);

  return (
    <section className="goals">
      <div className="detail-head">
        <h2>🎯 Objectifs de session</h2>
        <button className="primary" onClick={() => setCreating(!creating)}>{creating ? 'Annuler' : '+ Nouvel objectif'}</button>
      </div>
      {online === false && <p className="meta small">Serveur injoignable : les objectifs s’affichent dès le retour de la connexion.</p>}

      {creating && (
        <div className="goal-form toolbox">
          <input value={title} maxLength={120} onChange={e => setTitle(e.target.value)} placeholder="Ex. Ce soir : derniers combats du Cauchemar" />
          <div className="row">
            <select value={raw.id} onChange={e => { setDofusId(e.target.value); setSel(new Set()); }}>{catalog.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            <span className="meta small">Sélection rapide :</span>
            <button onClick={() => pick(hasCombat)}>⚔ Combats restants</button>
            <button onClick={() => pick(hasDungeon)}>⛫ Donjons restants</button>
            <button onClick={() => pick(isGroup)}>👥 À faire ensemble</button>
            <button onClick={() => pick(() => true)}>Tout ce qui reste</button>
            <button onClick={() => setSel(new Set())}>Aucune</button>
          </div>
          <ul className="goal-pick">
            {sections.map(s => (
              <li key={s.title} className="sec">
                <label className="sec-head"><input type="checkbox" checked={s.items.every(i => sel.has(i.id))} onChange={() => flipSection(s.items)} /> <strong>{s.title}</strong> <small>{s.items.length} restante{s.items.length > 1 ? 's' : ''}</small></label>
                <ul>{s.items.map(i => <li key={i.id}><label><input type="checkbox" checked={sel.has(i.id)} onChange={() => flip(i.id)} /> {i.name}</label><Chips i={i} /></li>)}</ul>
              </li>
            ))}
            {!remaining.length && <li className="meta">Tu as tout fait sur ce Dofus 🎉</li>}
          </ul>
          <div className="row"><button className="primary" onClick={() => void create()}>Créer l’objectif ({sel.size})</button>{err && <span className="warn">{err}</span>}</div>
        </div>
      )}

      {open.map(g => <GoalCard key={g.id} g={g} profileId={profileId} isDone={isDone} />)}
      {!open.length && !creating && <p className="meta">Aucun objectif en cours. Crée-en un pour la prochaine session !</p>}
      {!!archived.length && (
        <details className="archived"><summary className="meta small">Objectifs archivés ({archived.length})</summary>
          {archived.map(g => <div key={g.id} className="row meta small">✓ {g.title} <button onClick={() => void closeGoal(g.id, false)}>Rouvrir</button></div>)}
        </details>
      )}
    </section>
  );
}

/** Bandeau sous l'en-tête : objectif en cours, toujours visible. */
export function GoalBanner({ profileId, isDone, onOpen }: { profileId: number; isDone: IsDone; onOpen: () => void }) {
  const { open } = useGoals();
  const g = open[0]; if (!g) return null;
  const n = g.item_ids.filter(id => isDone(profileId, id)).length;
  const next = g.item_ids.map(id => getItem(id)).find((it, k) => it && !isDone(profileId, g.item_ids[k]));
  return (
    <button className="goal-banner" onClick={onOpen}>
      🎯 <strong>{g.title}</strong> <span className="bar"><span style={{ width: `${(n / g.item_ids.length) * 100}%` }} /></span> <small>{n}/{g.item_ids.length}</small>
      {next && <small className="nx">Prochaine : {next.name}</small>}
      {open.length > 1 && <small>+{open.length - 1}</small>}
    </button>
  );
}
