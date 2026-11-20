// Outils « session » pensés pour garder le cap sans se disperser :
// une seule chose à faire maintenant, minuteur avec pauses, récap de fin, note « où j'en étais »,
// série de jours, appel « On joue ? », tirage au sort et objectif de session commun.
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Bell, Dice5, Flag, Hourglass, Play, Shuffle, Square, StickyNote, Target, X } from 'lucide-react';
import { catalog, type ItemView } from './model/catalog';
import { viewFor } from './model/choices';
import { dofusInfo } from './data/tougli/dofus-info';
import { profiles } from './model/profiles';
import { entryAt, listDone, teamInfo, toggle } from './model/progress';
import { post } from './model/messages';
import { pushToasts } from './model/notifications';
import { createGoal } from './model/goals';
import { achKey, objDone, QCOUNT, questCount, questCountTarget, useAchData } from './model/achievements';
import { qtyOf } from './model/progress';
import { useProgress } from './model/progress';
import { useRef } from 'react';
import { burst } from './model/celebrate';

type IsDone = (p: number, id: string) => boolean;
const img = (f?: string | null) => (f ? `${import.meta.env.BASE_URL}dofus/${f}` : undefined);
const ls = { get<T>(k: string, d: T): T { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } } };

// ---------- Quêtes « normales » (hors répétables, succès, ressources…) ----------
const isQuestKey = (id: string) => !/^(rep|repfav|res|ach|acho|align|myorder|alm-|step|choice|goal)[:-]/.test(id);
/** Dofus commencés, les plus avancés d'abord, avec leurs prochaines quêtes. */
function started(p: number, isDone: IsDone) {
  return catalog.map(raw => {
    const v = viewFor(raw, p, isDone); const all = v.sections.flatMap(s => s.items);
    const done = v.itemIds.filter(id => isDone(p, id)).length;
    return { raw, info: dofusInfo.find(d => d.id === raw.id), done, total: v.itemIds.length, next: all.filter(i => !isDone(p, i.id)) };
  }).filter(x => x.done > 0 && x.done < x.total).sort((a, b) => b.done / b.total - a.done / a.total);
}

// ---------- 1. « Je fais quoi maintenant ? » ----------
export function NowCard({ profileId, isDone, onOpen }: { profileId: number; isDone: IsDone; onOpen: (v: string) => void }) {
  const list = started(profileId, isDone);
  const pool = list.flatMap(x => x.next.slice(0, 3).map(i => ({ i, x })));
  const [k, setK] = useState(0);
  if (!pool.length) return (
    <section className="now-card empty">
      <h3><Target size={18} /> Je fais quoi maintenant ?</h3>
      <p>Commence un Dofus dans <button className="link-like" onClick={() => onOpen('quetes/dofus')}>Quêtes → Dofus</button> et je te proposerai une seule quête à la fois.</p>
    </section>
  );
  const { i, x } = pool[k % pool.length];
  return (
    <section className="now-card">
      <h3><Target size={18} /> Je fais quoi maintenant ?</h3>
      <div className="now-main">
        {x.info?.image && <img src={img(x.info.image)} alt="" />}
        <div className="now-txt">
          <small>{x.raw.name} · {Math.round((x.done / x.total) * 100)} %</small>
          <strong>{i.url ? <a href={i.url} target="_blank" rel="noreferrer">{i.name}</a> : i.name}</strong>
          {i.hint && <em>{i.hint}</em>}
        </div>
      </div>
      <div className="now-actions">
        <button className="ok-btn" onClick={e => { burst(e.currentTarget); toggle(profileId, i.id, true); setK(0); }}>✓ C’est fait</button>
        <button onClick={() => setK(k + 1)} title="Proposer autre chose"><Shuffle size={15} /> Autre chose</button>
        <button className="link-like" onClick={() => onOpen(x.raw.id)}>Voir le Dofus →</button>
      </div>
    </section>
  );
}

// ---------- 2. Session : minuteur, pauses, récap, note ----------
interface Session { start: string; every: number; lastAlert: number; startDone: Record<string, number> }
const sKey = (p: number) => `fzth:v2:session:${p}`;
const noteKey = (p: number) => `fzth:v2:note:${p}`;
let ver = 0; const subs = new Set<() => void>();
const bump = () => { ver++; subs.forEach(f => f()); };
const useVer = () => useSyncExternalStore(cb => { subs.add(cb); return () => subs.delete(cb); }, () => ver);
let recapFor: { p: number; s: Session } | null = null;

const canadaTime = () => {
  const tz = ls.get<{ tz: string; label: string }>('fzth:v2:clock', { tz: 'America/Toronto', label: 'Canada' });
  return `${new Date().toLocaleTimeString('fr-FR', { timeZone: tz.tz, hour: '2-digit', minute: '2-digit' })} (${tz.label})`;
};
const doneByDofus = (p: number, isDone: IsDone) => Object.fromEntries(catalog.map(raw => [raw.id, viewFor(raw, p, isDone).itemIds.filter(id => isDone(p, id)).length]));
export const getSession = (p: number) => ls.get<Session | null>(sKey(p), null);
export function startSession(p: number, isDone: IsDone, every: number) {
  ls.set(sKey(p), { start: new Date().toISOString(), every, lastAlert: 0, startDone: doneByDofus(p, isDone) }); bump();
}
export function stopSession(p: number) { const s = getSession(p); if (!s) return; localStorage.removeItem(sKey(p)); recapFor = { p, s }; bump(); }
const fmtDur = (ms: number) => { const m = Math.floor(ms / 60000); return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}` : `${m} min`; };

/** Tourne en fond (monté une fois dans l'app) : rappel de pause à intervalle régulier. */
export function SessionWatcher({ profileId }: { profileId: number }) {
  useEffect(() => {
    const t = setInterval(() => {
      const s = getSession(profileId); if (!s || !s.every) return;
      const mins = (Date.now() - Date.parse(s.start)) / 60000;
      const n = Math.floor(mins / s.every);
      if (n > s.lastAlert) {
        ls.set(sKey(profileId), { ...s, lastAlert: n }); bump();
        pushToasts([{ id: `pause-${s.start}-${n}`, kind: 'msg', cat: 'news', who: profileId, at: new Date().toISOString(), text: `⏰ ${fmtDur(n * s.every * 60000)} de jeu : petite pause ? (il est ${canadaTime()})` }]);
      }
    }, 20000);
    return () => clearInterval(t);
  }, [profileId]);
  return null;
}

/** Petit chrono dans l'en-tête quand une session tourne. */
export function SessionChip({ profileId }: { profileId: number }) {
  useVer(); const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick(x => x + 1), 30000); return () => clearInterval(t); }, []);
  const s = getSession(profileId); if (!s) return null;
  return <button className="session-chip" onClick={() => stopSession(profileId)} title="Terminer la session et voir le récap"><Hourglass size={14} /> {fmtDur(Date.now() - Date.parse(s.start))} <Square size={11} /></button>;
}

export function SessionCard({ profileId, isDone }: { profileId: number; isDone: IsDone }) {
  useVer(); const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick(x => x + 1), 30000); return () => clearInterval(t); }, []);
  const [every, setEvery] = useState(() => ls.get('fzth:v2:sessionEvery', 45));
  const s = getSession(profileId);
  return (
    <section className="t-card session-card">
      <h3><Hourglass size={17} /> Session</h3>
      {s ? <>
        <p className="session-time">{fmtDur(Date.now() - Date.parse(s.start))}</p>
        <p className="meta small">Pause proposée toutes les {s.every} min.</p>
        <button className="danger-btn" onClick={() => stopSession(profileId)}><Square size={14} /> Terminer et voir le récap</button>
      </> : <>
        <p className="meta small">Lance le chrono en commençant : un rappel de pause arrive régulièrement, et un récap s’affiche à la fin.</p>
        <label className="session-every">Pause toutes les
          <select value={every} onChange={e => { const v = Number(e.target.value); setEvery(v); ls.set('fzth:v2:sessionEvery', v); }}>
            {[30, 45, 60, 90].map(m => <option key={m} value={m}>{m} min</option>)}<option value={0}>jamais</option>
          </select>
        </label>
        <button className="primary" onClick={() => startSession(profileId, isDone, every)}><Play size={14} /> Commencer la session</button>
      </>}
      <Streak profileId={profileId} />
    </section>
  );
}

/** Fin de session : ce qui a été fait + note « où j'en étais » pour la prochaine fois. */
export function SessionRecap({ isDone }: { isDone: IsDone }) {
  useVer();
  const [note, setNote] = useState('');
  if (!recapFor) return null;
  const { p, s } = recapFor;
  const quests = listDone(p).filter(id => isQuestKey(id) && (entryAt(p, id) ?? '') >= s.start);
  const reps = listDone(p).filter(id => id.startsWith('rep:') && (entryAt(p, id) ?? '') >= s.start).length;
  const now = doneByDofus(p, isDone);
  const moved = catalog.map(raw => ({ raw, d: (now[raw.id] ?? 0) - (s.startDone[raw.id] ?? 0), t: viewFor(raw, p, isDone).itemIds.length }))
    .filter(x => x.d > 0).sort((a, b) => b.d - a.d).slice(0, 4);
  const close = () => { if (note.trim()) ls.set(noteKey(p), { text: note.trim(), at: new Date().toISOString() }); recapFor = null; setNote(''); bump(); };
  return (
    <div className="trophy-back" onClick={close}>
      <div className="trophy recap" onClick={e => e.stopPropagation()}>
        <p className="eyebrow">Fin de session · {fmtDur(Date.now() - Date.parse(s.start))}</p>
        <h2>Bien joué !</h2>
        <div className="recap-nums">
          <span><b>{quests.length}</b> quête{quests.length > 1 ? 's' : ''}</span>
          <span><b>{reps}</b> répétable{reps > 1 ? 's' : ''}</span>
        </div>
        {moved.length > 0 && <ul className="recap-list">{moved.map(m => {
          const di = dofusInfo.find(d => d.id === m.raw.id);
          return <li key={m.raw.id}>{di?.image && <img src={img(di.image)} alt="" />}{m.raw.name} <b>+{Math.round((m.d / Math.max(1, m.t)) * 100)} %</b></li>;
        })}</ul>}
        <label className="recap-note"><StickyNote size={15} /> Une note pour la prochaine fois ? (facultatif)
          <input value={note} onChange={e => setNote(e.target.value)} maxLength={200} placeholder="ex. j’allais chercher la clé du Kardorim" />
        </label>
        <button className="primary" onClick={close}>Enregistrer et fermer</button>
      </div>
    </div>
  );
}

/** « Où j'en étais » : automatique, d'après la dernière quête cochée (+ la note facultative de fin de session). */
export function LastNote({ profileId, isDone, onOpen }: { profileId: number; isDone: IsDone; onOpen: (v: string) => void }) {
  useVer();
  const n = ls.get<{ text: string; at: string } | null>(noteKey(profileId), null);
  // Dernière quête cochée, son Dofus et la quête suivante.
  let last: { id: string; at: string } | null = null;
  for (const id of listDone(profileId)) { if (!isQuestKey(id)) continue; const at = entryAt(profileId, id) ?? ''; if (!last || at > last.at) last = { id, at }; }
  let ctx: { dofus: string; dofusId: string; name: string; next?: string } | null = null;
  // Une même quête sert à plusieurs Dofus : on préfère le dernier Dofus ouvert.
  const lastDofus = ls.get('fzth:v2:lastDofus', '');
  const order = [...catalog].sort((a, b) => Number(b.id === lastDofus) - Number(a.id === lastDofus));
  if (last) for (const raw of order) {
    const items = viewFor(raw, profileId, isDone).sections.flatMap(x => x.items);
    const k = items.findIndex(i => i.id === last!.id);
    if (k >= 0) { ctx = { dofus: raw.name, dofusId: raw.id, name: items[k].name, next: items.slice(k + 1).find(i => !isDone(profileId, i.id))?.name ?? items.find(i => !isDone(profileId, i.id))?.name }; break; }
  }
  if (!ctx && !n) return null;
  const when = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  return (
    <div className="last-note">
      <StickyNote size={18} />
      <span>
        {ctx && last && <><small>Où j’en étais ({when(last.at)})</small><strong>Dernière quête : « {ctx.name} » · {ctx.dofus}</strong>{ctx.next && <em>Prochaine : {ctx.next}</em>}</>}
        {n && <em className="note-txt">📝 {n.text}</em>}
      </span>
      {ctx && <button className="primary" onClick={() => onOpen(ctx!.dofusId)}>Reprendre</button>}
      {n && <button onClick={() => { localStorage.removeItem(noteKey(profileId)); bump(); }} aria-label="Effacer la note"><X size={16} /></button>}
    </div>
  );
}

// ---------- 3. Série de jours (douce : un jour raté ne fait rien perdre d'autre) ----------
function Streak({ profileId }: { profileId: number }) {
  const days = new Set(listDone(profileId, 'rep:').map(id => (entryAt(profileId, id) ?? '').slice(0, 10)).filter(Boolean));
  const d = new Date(); let n = 0;
  if (!days.has(d.toISOString().slice(0, 10))) d.setDate(d.getDate() - 1);
  while (days.has(d.toISOString().slice(0, 10))) { n++; d.setDate(d.getDate() - 1); }
  return <p className="streak">{n > 0 ? <>🔥 <b>{n} jour{n > 1 ? 's' : ''}</b> d’affilée avec au moins une répétable</> : <>Fais une répétable aujourd’hui pour lancer ta série 🔥</>}</p>;
}

// ---------- 4. « On joue ? » ----------
export function CallButton({ profileId }: { profileId: number }) {
  const me = profiles.find(p => p.id === profileId)!;
  const [sent, setSent] = useState(false);
  return (
    <button className="call-btn" disabled={sent} onClick={() => { void post('text', `🎮 ${me.name} lance l’appel : on joue ? (il est ${canadaTime()} chez notre ami)`); setSent(true); setTimeout(() => setSent(false), 60000); }}>
      <Bell size={16} /> {sent ? 'Appel envoyé !' : 'On joue ?'}
    </button>
  );
}

// ---------- 5. Tirage au sort + objectif de session commun ----------
const GROUP = new Set(['combat-groupe', 'combat-vague-groupe', 'donjon', 'aide-personnes']);
const isGroup = (i: ItemView) => !!i.dungeon?.name || (i.objectives ?? []).some(o => GROUP.has(o.type));
export function Roulette({ profileId, isDone, onOpen }: { profileId: number; isDone: IsDone; onOpen: (v: string) => void }) {
  const { team } = teamInfo();
  const members = profiles.filter(p => p.id === profileId || team[p.id]);
  const [pick, setPick] = useState<{ i: ItemView; dofus: string; id: string } | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [goalMsg, setGoalMsg] = useState('');
  const pool: { i: ItemView; dofus: string; id: string }[] = [];
  const seen = new Set<string>();
  for (const x of started(profileId, isDone)) for (const i of x.next.slice(0, 12)) if (isGroup(i) && !seen.has(i.id) && members.some(m => !isDone(m.id, i.id))) { seen.add(i.id); pool.push({ i, dofus: x.raw.name, id: x.raw.id }); }
  const spin = () => {
    if (!pool.length) return; setSpinning(true); let n = 0;
    const t = setInterval(() => { setPick(pool[Math.floor(Math.random() * pool.length)]); if (++n > 12) { clearInterval(t); setSpinning(false); } }, 90);
  };
  const makeGoal = async () => {
    if (!pick) return;
    const raw = catalog.find(c => c.id === pick.id)!; const all = viewFor(raw, profileId, isDone).sections.flatMap(s => s.items);
    const from = all.findIndex(i => i.id === pick.i.id);
    const ids = all.slice(from, from + 5).filter(i => !isDone(profileId, i.id)).map(i => i.id);
    try { await createGoal(`Session : ${pick.i.name}`, pick.id, ids); setGoalMsg('✓ Objectif affiché en haut du site chez les trois'); } catch { setGoalMsg('Serveur injoignable, réessaie.'); }
  };
  return (
    <section className="t-card roulette">
      <h3><Dice5 size={17} /> On fait quoi ensemble ?</h3>
      {pool.length ? <>
        <div className={`roulette-pick${spinning ? ' spin' : ''}`}>{pick ? <><strong>{pick.i.name}</strong><small>{pick.dofus}{pick.i.dungeon?.name ? ` · ${pick.i.dungeon.name}` : ''}</small></> : <small>Une quête de groupe ou un donjon tiré au hasard parmi vos Dofus en cours.</small>}</div>
        <div className="now-actions">
          <button className="primary" onClick={spin} disabled={spinning}><Dice5 size={15} /> {pick ? 'Relancer' : 'Tirer au sort'}</button>
          {pick && !spinning && <button onClick={() => void makeGoal()}><Flag size={15} /> En faire l’objectif de session</button>}
          {pick && !spinning && <button className="link-like" onClick={() => onOpen(pick.id)}>Voir →</button>}
        </div>
        {goalMsg && <p className="meta small">{goalMsg}</p>}
      </> : <p className="meta">Aucune quête de groupe à venir dans vos Dofus en cours.</p>}
    </section>
  );
}

// ---------- Succès validés automatiquement ----------
/** Dès que tous les objectifs d'un succès sont faits (quêtes cochées, succès inclus…), on coche le succès. */
export function AutoAchievements({ profileId }: { profileId: number }) {
  const d = useAchData();
  const { version, isDone } = useProgress();
  const prev = useRef<Set<number> | null>(null);
  useEffect(() => {
    if (!d) return;
    const t = setTimeout(() => {
      const complete = new Set<number>();
      for (const a of d.list) if (a.o && a.o.every((_, i) => objDone(d, a, i, profileId, isDone))) complete.add(a.id);
      // « Terminer N quêtes » : d'après le compteur de quêtes.
      const qc = questCount(profileId, qtyOf(profileId, QCOUNT), entryAt(profileId, QCOUNT), listDone(profileId), id => entryAt(profileId, id));
      if (qc) for (const a of d.list) { const n = questCountTarget(a); if (n && qc.total >= n) complete.add(a.id); }
      // Seulement ceux qui viennent de se compléter (un succès décoché à la main n'est pas recoché tant que rien ne change).
      const fresh = [...complete].filter(id => !prev.current?.has(id) && !isDone(profileId, achKey(id)));
      prev.current = complete;
      if (!fresh.length) return;
      for (const id of fresh) toggle(profileId, achKey(id), true, { silent: true });
      const names = fresh.map(id => d.byId.get(id)!.n);
      pushToasts([{ id: `auto-ach-${fresh.join('-')}`, kind: 'msg', cat: 'news', who: profileId, at: new Date().toISOString(),
        text: `🏆 Succès validé${names.length > 1 ? 's' : ''} : ${names.slice(0, 3).join(', ')}${names.length > 3 ? '…' : ''}` }]);
    }, 400);
    return () => clearTimeout(t);
  }, [d, version, profileId, isDone]);
  return null;
}
