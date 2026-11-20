import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Bell as BellIcon, CalendarDays, Castle, Egg, Hammer, History, MessageCircle, Moon, Sparkles, Sun, Trophy, Users, Wrench, AlarmClock, Lightbulb, Lock, Download, Share, Upload, KeyRound, Save, Check, Swords, Skull, Clock4, Handshake, RotateCcw, TrendingUp, Coins, Package, PictureInPicture2, Link2, Info, ListOrdered, Repeat, ScrollText, ArrowRight, Target } from 'lucide-react';
import { repeatables } from './data/jeu/quetes';
import { favKey, repKey, repTodo } from './model/repeat';
import { isDone as isDoneP } from './model/progress';
import { cachedRange, fetchRange, parisToday } from './model/almanax';
import { tagIcon } from './ui/QuestTags';
import { GROUP_KEY, groupQuests, type GroupBy, type QuestGroup } from './model/questGroups';
import { applyNow, forgetReopen, useOverlayState } from './model/overlayState';
import { install, useInstall } from './model/install';
import { ReportButton, ReportDialog } from './Report';
import { EggRing, eggColor } from './ui/EggRing';
import { burst, celebrateDofus, closeTrophy, useTrophy } from './model/celebrate';
import { catalog, type DofusView, type ItemView } from './model/catalog';
import { profiles } from './model/profiles';
import { approveReset, askReset, exportProfile, finishReset, getHistory, hasCode, importProfile, isUnlocked, listResetRequests, login, logout, resetStatus, resetToken, setShare, teamInfo, toggle, undo, useProgress, type SyncStatus } from './model/progress';
import { labelOf, search } from './model/search';
import { dofusInfo, type DofusInfo } from './data/tougli/dofus-info';
import { resourceNeeds } from './model/resources';
import { iconInfo, type IconFamily } from './model/icons';
import { requirements } from './model/requirements';
const Tools = lazy(() => import('./Tools').then(m => ({ default: m.Tools })));
import { Mates, OfferButton, ResIcon } from './Mates';
import { onNewMessages, post as postMessage, useMessages, watchMessages } from './model/messages';
import { Clock } from './Clock';
import { GoalBanner } from './Goals';
import { watchGoals } from './model/goals';
import { setPresencePage, watchTeamLive } from './model/teamlive';
import { OnlineNow } from './Presence';
const Jobs = lazy(() => import('./Jobs').then(m => ({ default: m.Jobs })));
import { CatchUp } from './CatchUp';
import { CallButton, LastNote, NowCard, Roulette, SessionCard, SessionChip, SessionRecap, SessionWatcher } from './Session';
const Quests = lazy(() => import('./Quests').then(m => ({ default: m.Quests })));
const Achievements = lazy(() => import('./Achievements').then(m => ({ default: m.Achievements })));
import { almostDone, achKey, achsForQuest, eventStatus, useAchData } from './model/achievements';
import { useDungeons } from './model/dungeonData';
const Almanax = lazy(() => import('./Almanax').then(m => ({ default: m.Almanax })));
const Team = lazy(() => import('./Team').then(m => ({ default: m.Team })));
const OverlayView = lazy(() => import('./Overlay').then(m => ({ default: m.OverlayView })));
const overlayMod = () => import('./Overlay');
const openOverlay = (p: number, d?: string) => void overlayMod().then(m => m.openOverlay(p, d));
import { CATS, catOf, dismissCat, enableBrowserNotifications, isMuted, markAllSeen, pushToasts, setMuted, useNotifications, watchNotifications } from './model/notifications';
import { picksFor, setPick, viewFor } from './model/choices';

const remember = <T,>(k: string, def: T): [T, (v: T) => void] => {
  const [v, setV] = useState<T>(() => { try { const r = localStorage.getItem(k); return r === null ? def : JSON.parse(r); } catch { return def; } });
  return [v, (n: T) => { setV(n); try { localStorage.setItem(k, JSON.stringify(n)); } catch { /* ignore */ } }];
};

// ---------- Pages et adresses ----------
// today · almanax · quetes/dofus · quetes/rep · quetes/align · <id d'un Dofus> · succes · jobs · team/<onglet> · tools
const LEGACY: Record<string, string> = { home: 'today', team: 'team/ensemble', messages: 'team/messages', quetes: 'quetes/dofus' };
const normView = (v: string) => LEGACY[v] ?? v;
const fromHash = () => (location.hash.startsWith('#/') ? decodeURIComponent(location.hash.slice(2)) : null);
/** Section du menu à laquelle appartient une page (une page de Dofus est rangée dans « Quêtes », comme en jeu). */
export const sectionOf = (v: string) => v === 'today' || v === 'almanax' ? 'today' : v.startsWith('team') ? 'team' : ['succes', 'jobs', 'tools'].includes(v) ? v : 'quetes';
function useRoute(): [string, (v: string) => void] {
  const [view, setState] = useState(() => {
    const h = fromHash(); if (h) return normView(h);
    let v = 'today'; try { v = normView(JSON.parse(localStorage.getItem('fzth:v2:view') ?? '"today"')); } catch { /* ignore */ }
    if (location.hash !== '#overlay') history.replaceState(null, '', '#/' + v);
    return v;
  });
  useEffect(() => {
    const on = () => { const h = fromHash(); if (h) setState(normView(h)); };
    window.addEventListener('hashchange', on); return () => window.removeEventListener('hashchange', on);
  }, []);
  useEffect(() => { try { localStorage.setItem('fzth:v2:view', JSON.stringify(view)); } catch { /* ignore */ } document.querySelector('.page-fade')?.scrollTo?.(0, 0); window.scrollTo(0, 0); }, [view]);
  const go = (v: string) => { v = normView(v); if (fromHash() !== v) location.hash = '/' + v; else setState(v); };
  return [view, go];
}

export function App() {
  const { status, lastSync, pendingCount, isDone } = useProgress();
  const [active, setActive] = remember<number | null>('fzth:v2:active', null);
  const [view, setView] = useRoute();
  const [hideDone, setHideDone] = remember<boolean>('fzth:v2:hideDone', false);
  const [asking, setAsking] = useState<number | null>(null);
  const profile = active !== null && isUnlocked(active) ? profiles.find(p => p.id === active) : undefined;
  const info = dofusInfo.find(d => d.id === view);
  const [lastDofus, setLastDofus] = remember<string>('fzth:v2:lastDofus', 'dom-de-pin');
  useEffect(() => { if (info && info.id !== lastDofus) setLastDofus(info.id); }, [info?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { document.body.dataset.world = profile?.world ?? 'none'; }, [profile?.world]);
  // Précharge l'overlay : la mini-fenêtre doit s'ouvrir juste après le clic.
  useEffect(() => { const t = setTimeout(() => void overlayMod(), 2500); return () => clearTimeout(t); }, []);
  useEffect(() => { watchNotifications(profile?.id ?? null); watchMessages(profile?.id ?? null); watchGoals(profile?.id ?? null); watchTeamLive(profile?.id ?? null); }, [profile?.id]);
  // Page affichée, visible par les coéquipiers (« Volrod · Dofus Cauchemar »).
  useEffect(() => {
    const labels: Record<string, string> = { today: 'Aujourd’hui', jobs: 'Métiers', almanax: 'Almanax', 'team/messages': 'Messages', tools: 'Outils', succes: 'Succès', 'quetes/dofus': 'Quêtes · Dofus', 'quetes/rep': 'Quêtes répétables', 'quetes/align': 'Alignement' };
    setPresencePage(labels[view] ?? dofusInfo.find(d => d.id === view)?.name ?? (view.startsWith('team') ? 'Équipe' : 'Site'));
  }, [view]);
  // Nouveaux messages des autres : message éphémère (+ notification du navigateur si autorisée), sauf si on est déjà sur la messagerie.
  useEffect(() => { const off = onNewMessages(ms => {
    if (view === 'team/messages') return;
    pushToasts(ms.map(m => ({ id: 'msg-' + m.id, kind: 'msg' as const, cat: m.kind === 'done' ? 'news' as const : m.kind === 'text' ? 'chat' as const : 'trade' as const, who: m.profile_id, at: m.created_at, text: `${profiles.find(p => p.id === m.profile_id)?.name} : ${m.body}` })));
  }); return () => { off(); }; }, [view]);
  // Annonce automatique quand un Dofus vient d'être terminé.
  useEffect(() => {
    if (!profile) return;
    const k = `fzth:v2:finished:${profile.id}`;
    const now = catalog.filter(raw => { const v = viewFor(raw, profile.id, isDone); return v.itemIds.length > 0 && v.itemIds.every(id => isDone(profile.id, id)); }).map(r => r.id);
    let prev: string[] | null = null; try { prev = JSON.parse(localStorage.getItem(k) ?? 'null'); } catch { /* ignore */ }
    if (prev) for (const id of now.filter(x => !prev!.includes(x))) { void postMessage('done', `${profile.name} a terminé le ${catalog.find(c => c.id === id)?.name} !`, id); celebrateDofus(catalog.find(c => c.id === id)?.name ?? 'Dofus', dofusInfo.find(d => d.id === id)?.image); }
    try { localStorage.setItem(k, JSON.stringify(now)); } catch { /* ignore */ }
  });
  const { unread } = useMessages();
  const repLeft = profile ? repTodo(repeatables, profile.id, isDone).length : 0;

  // Fenêtre overlay séparée (navigateurs sans mini-fenêtre) : #overlay
  if (location.hash === '#overlay' && profile) return <Suspense fallback={null}><OverlayView profileId={profile.id} /></Suspense>;

  const open = (pid: number) => { if (isUnlocked(pid)) { setActive(pid); setView('today'); } else setAsking(pid); };

  if (!profile) {
    return (
      <div className="app landing">
        <Particles />
        <h1 className="landing-title">From Zero to Hero</h1>
        <p className="landing-sub">Choisis ton personnage</p>
        <section className="team">
          {profiles.map(p => (
            <button key={p.id} className="portrait" data-world={p.world} onClick={() => open(p.id)}>
              <img src={`${import.meta.env.BASE_URL}persos/${p.image}`} alt={`Illustration de ${p.name}`} />
              <span className="portrait-info"><span className="plate"><strong>{p.name}</strong><small>{p.classe}{isUnlocked(p.id) ? '' : <> · <Lock size={11} /></>}</small></span></span>
            </button>
          ))}
        </section>
        {asking !== null && <CodeDialog profileId={asking} onClose={() => setAsking(null)} onOk={() => { setActive(asking); setView('today'); setAsking(null); }} />}
      </div>
    );
  }

  return (
    <div className="app">
      <div className="perso-backdrop" aria-hidden style={{ backgroundImage: `url(${import.meta.env.BASE_URL}persos/${profile.image})` }} />
      <header className="top" style={{ '--hero': `url(${import.meta.env.BASE_URL}persos/${profile.image})` } as React.CSSProperties}>
        <h1><button className="home-link" onClick={() => setView('today')}><span className="sym">{profile.symbol}</span> From Zero to Hero</button></h1>
        <nav className="mainnav">
          {([
            ['today', 'today', 'Aujourd’hui', 'Ce qu’on fait en se connectant : répétables, Almanax, reprise', <Sun key="i" />, repLeft],
            ['quetes', view.startsWith('quetes') ? view : 'quetes/dofus', 'Quêtes', 'Journal de quêtes : Dofus, répétables, alignement', <ScrollText key="i" />, 0],
            ['succes', 'succes', 'Succès', 'Succès du jeu', <Trophy key="i" />, 0],
            ['jobs', 'jobs', 'Métiers', 'Métiers & ressources', <Hammer key="i" />, 0],
            ['team', view.startsWith('team') ? view : 'team/ensemble', 'Équipe', 'Le groupe : jouer ensemble, messages, objectifs…', <Users key="i" />, unread],
            ['tools', 'tools', 'Outils', 'Chasse au trésor, solveurs, stuffs', <Wrench key="i" />, 0],
          ] as [string, string, string, string, JSX.Element, number][]).map(([sec, target, label, title, icon, badge]) => (
            <button key={sec} className={sectionOf(view) === sec ? 'on' : ''} title={title} onClick={() => setView(sectionOf(view) === sec && sec !== 'today' ? (sec === 'quetes' ? 'quetes/dofus' : sec === 'team' ? 'team/ensemble' : sec) : target)}>
              <span className="ic">{icon}{badge > 0 && <span className="badge">{badge}</span>}</span><span className="lbl">{label}</span>
            </button>
          ))}
        </nav>
        <SearchBox profileId={profile.id} isDone={isDone} onOpenDofus={id => setView(id)} />
        <OnlineNow profileId={profile.id} />
        <SessionChip profileId={profile.id} />
        <Clock />
        <ThemeToggle />
        <Journal profileId={profile.id} />
        <Bell onOpenTools={() => setView('tools')} />
        <SyncBadge status={status} lastSync={lastSync} pending={pendingCount} />
        <MeMenu profile={profile} onOverlay={() => void openOverlay(profile.id, info?.id ?? lastDofus)} onChange={() => setActive(null)} onLogout={() => { logout(profile.id); setActive(null); }} />
      </header>
      <ShareBanner profileId={profile.id} />
      <OverlayBanner profileId={profile.id} />
      {view !== 'team/goals' && <GoalBanner profileId={profile.id} isDone={isDone} onOpen={() => setView('team/goals')} />}
      <Toasts />
      <TrophyModal />
      <SessionRecap isDone={isDone} />
      <SessionWatcher profileId={profile.id} />
      <ReportDialog profileId={profile.id} />
      <ResetRequests profileId={profile.id} />

      <Suspense fallback={<div className="panel page-loading"><span className="skeleton" /><span className="skeleton" /><span className="skeleton" /></div>}>
      <div key={view} className="page-fade">
      {view === 'today' ? <Today profileId={profile.id} isDone={isDone} onOpen={setView} />
        : view === 'almanax' ? <Almanax profileId={profile.id} isDone={isDone} />
        : view.startsWith('quetes/') ? <Quests profileId={profile.id} isDone={isDone} tab={view.slice(7)} onTab={t => setView('quetes/' + t)} dofusGrid={<DofusGrid profileId={profile.id} isDone={isDone} onOpen={setView} />} />
        : view === 'succes' ? <Achievements profileId={profile.id} isDone={isDone} />
        : view.startsWith('team') ? <Team profileId={profile.id} isDone={isDone} tab={view.slice(5) || 'ensemble'} onTab={t => setView('team/' + t)} onOpenDofus={setView} />
        : view === 'tools' ? <Tools profileId={profile.id} />
        : view === 'jobs' ? <Jobs profileId={profile.id} isDone={isDone} />
        : info ? (
          <div className="with-rail">
            <DofusPage key={info.id} info={info} raw={catalog.find(c => c.id === info.id)} profileId={profile.id} hideDone={hideDone} setHideDone={setHideDone} isDone={isDone} onBack={() => setView('quetes/dofus')} />
            <DofusRail current={info.id} profileId={profile.id} isDone={isDone} onOpen={setView} />
          </div>
        )
        : <Today profileId={profile.id} isDone={isDone} onOpen={setView} />}
      </div>
      </Suspense>
    </div>
  );
}

function CodeDialog({ profileId, onClose, onOk }: { profileId: number; onClose: () => void; onOk: () => void }) {
  const p = profiles.find(x => x.id === profileId)!;
  const [exists, setExists] = useState<boolean | null | undefined>(undefined); // undefined = en cours de vérification
  const [code, setCode] = useState(''); const [code2, setCode2] = useState('');
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const [share, setShareOpt] = useState(true);
  useEffect(() => { let alive = true; hasCode(profileId).then(v => { if (alive) setExists(v); }); return () => { alive = false; }; }, [profileId]);
  const creating = exists === false || exists === null;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    if (creating && exists === false && code !== code2) { setError('Les deux codes ne sont pas identiques.'); return; }
    setBusy(true); const r = await login(profileId, code); setBusy(false);
    if (r.ok && r.created && share && !r.offline) { try { await setShare(profileId, true); } catch { /* réessayable depuis le bandeau */ } }
    if (r.ok) onOk(); else setError(r.error);
  };
  return (
    <div className="modal" onClick={onClose}>
      <form className="panel code-box" data-world={p.world} onClick={e => e.stopPropagation()} onSubmit={submit}>
        <img className="avatar huge" src={`${import.meta.env.BASE_URL}persos/${p.image}`} alt="" />
        <h2>{p.name}</h2>
        {exists === undefined ? <p>Vérification…</p> : exists === false ? (
          <p>Première connexion : choisis le code secret de {p.name} (au moins 4 caractères). Il te sera demandé pour voir ses quêtes.</p>
        ) : exists ? <p>Entre le code de {p.name}.</p> : <p>Serveur injoignable : entre le code de {p.name} (ou choisis-le si c’est la première fois sur cet appareil).</p>}
        <input autoFocus type="password" inputMode="text" autoComplete="current-password" value={code} onChange={e => setCode(e.target.value)} placeholder="Code" />
        {exists === false && <input type="password" value={code2} onChange={e => setCode2(e.target.value)} placeholder="Confirme le code" />}
        {exists === false && <label className="toggle small share-opt"><input type="checkbox" checked={share} onChange={e => setShareOpt(e.target.checked)} /> Partager ma progression avec l’équipe (conseillé : c’est ce qui permet de jouer ensemble)</label>}
        {error && <p className="warn">{error}</p>}
        {exists && <ForgotCode profileId={profileId} onDone={onOk} />}
        <div className="row"><button type="button" onClick={onClose}>Annuler</button><button type="submit" className="primary" disabled={busy || exists === undefined}>{exists === false ? 'Créer mon code' : 'Entrer'}</button></div>
      </form>
    </div>
  );
}

const img = (file: string | null) => (file ? `${import.meta.env.BASE_URL}dofus/${file}` : undefined);

/** « Aujourd'hui » : ce qui rapporte le plus avec ce qui est déjà commencé. */
function NextActions({ profileId, isDone, onOpen }: { profileId: number; isDone: (p: number, id: string) => boolean; onOpen: (id: string) => void }) {
  const d = useAchData();
  const djData = useDungeons();
  const { team } = teamInfo();
  const members = profiles.filter(p => p.id === profileId || team[p.id]);
  const [hidden, setHidden] = remember<string>('fzth:v2:nextHidden', '');
  const today = new Date().toISOString().slice(0, 10);
  if (hidden === today) return <button className="next-show" onClick={() => setHidden('')}>💡 Voir les idées du jour</button>;
  // Dofus le plus proche de la fin parmi ceux commencés
  const doing = catalog.map(raw => { const v = viewFor(raw, profileId, isDone); const left = v.sections.flatMap(s => s.items).filter(i => !isDone(profileId, i.id)); return { raw, v, left }; })
    .filter(x => x.left.length && x.left.length < x.v.itemIds.length).sort((a, b) => a.left.length - b.left.length);
  // Donjon de la prochaine quête d'un Dofus en cours
  let dj: { name: string; left: number; key?: string; dofus: string } | null = null;
  for (const x of doing) {
    const it = x.left[0]; const label = it.dungeon?.name ?? it.objectives?.find(o => o.type === 'donjon')?.label;
    const dd = label && djData ? djData.dungeonFor(label) : undefined;
    if (dd) { dj = { name: dd.name, left: dd.ach.filter(a => members.some(m => !isDone(m.id, achKey(a.id)))).length, key: djData?.keys[dd.id]?.name, dofus: x.raw.id }; break; }
  }
  const almost = d ? almostDone(d, profileId, isDone)[0] : undefined;
  const ev = d ? eventStatus(d, profileId, isDone).find(x => x.days <= 30 && x.left.length) : undefined;
  const cards: JSX.Element[] = [];
  if (dj) cards.push(<button key="dj" className="next-card" onClick={() => onOpen('succes')}><span className="nc-ic"><Castle /></span><span><small>Donjon à préparer</small><strong>{dj.name}</strong><em>{dj.left} succès à cumuler en équipe{dj.key ? ` · 🗝 ${dj.key}` : ''}</em></span></button>);
  if (almost) cards.push(<button key="ach" className="next-card" onClick={() => onOpen('succes')}><span className="nc-ic"><Trophy /></span><span><small>Succès presque fini</small><strong>{almost.a.n}</strong><em>{almost.done}/{almost.total} objectifs · {almost.a.p} pts</em></span></button>);
  if (ev) cards.push(<button key="ev" className="next-card hot" onClick={() => onOpen('succes')}><span className="nc-ic"><AlarmClock /></span><span><small>{ev.days === 0 ? 'C’est la période' : `Dans ~${ev.days} jours`}</small><strong>Événement {ev.e.label}</strong><em>{ev.left.length} succès · {ev.pts} pts à prendre</em></span></button>);
  if (!cards.length) return null;
  return (
    <section className="next-actions">
      <h3><Lightbulb size={18} /> À préparer <button className="link-like" onClick={() => setHidden(today)}>masquer pour aujourd’hui</button></h3>
      <div className="next-grid">{cards}</div>
    </section>
  );
}

/** Grande annonce quand un Dofus vient d'être terminé. */
function TrophyModal() {
  const t = useTrophy();
  if (!t) return null;
  return (
    <div className="trophy-back" onClick={closeTrophy}>
      <div className="trophy" style={{ '--egg': eggColor(t.image) } as React.CSSProperties} onClick={e => e.stopPropagation()}>
        <p className="eyebrow">Félicitations</p>
        {t.image && <img src={img(t.image)} alt="" />}
        <h2>Dofus obtenu !</h2>
        <strong>{t.name}</strong>
        <button className="primary" onClick={closeTrophy}>Continuer l’aventure</button>
      </div>
    </div>
  );
}

/** Particules lumineuses qui flottent derrière les portraits (positions fixes pour éviter de tout recalculer). */
const SPARKS = Array.from({ length: 34 }, (_, i) => ({ l: (i * 37) % 100, d: 8 + ((i * 7) % 10), delay: -((i * 13) % 17), s: 2 + ((i * 5) % 4), gold: i % 3 !== 0 }));
function Particles() {
  return <div className="particles" aria-hidden>{SPARKS.map((p, i) => <i key={i} className={p.gold ? 'g' : 'r'} style={{ left: `${p.l}%`, width: p.s, height: p.s, animationDuration: `${p.d}s`, animationDelay: `${p.delay}s` }} />)}</div>;
}

/** Rappel tant que ma progression n'est pas partagée (sinon « Jouer ensemble », classement, etc. restent vides pour les autres). */
function ShareBanner({ profileId }: { profileId: number }) {
  const { team, teamLoaded } = teamInfo();
  const [later, setLater] = remember<string>(`fzth:v2:shareLater:${profileId}`, '');
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const today = new Date().toISOString().slice(0, 10);
  if (!teamLoaded || team[profileId] || later === today) return null;
  const go = async () => { setBusy(true); setErr(''); try { await setShare(profileId, true); } catch { setErr('Serveur injoignable, réessaie dans un instant.'); } setBusy(false); };
  return (
    <div className="share-banner">
      <Users size={18} />
      <span><strong>Ta progression n’est pas partagée.</strong> Tes coéquipiers ne voient pas ton avancée : « Jouer ensemble », le classement et les alertes de ressources restent vides pour eux.{err && <em> {err}</em>}</span>
      <button className="primary" disabled={busy} onClick={() => void go()}>{busy ? '…' : 'Partager maintenant'}</button>
      <button onClick={() => setLater(today)}>Plus tard</button>
    </div>
  );
}

/** Code oublié : demande à un coéquipier, puis choix d'un nouveau code (la progression est conservée). */
function ForgotCode({ profileId, onDone }: { profileId: number; onDone: () => void }) {
  const [st, setSt] = useState<'closed' | 'none' | 'pending' | 'approved'>(resetToken(profileId) ? 'pending' : 'closed');
  const [c1, setC1] = useState(''); const [c2, setC2] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (st !== 'pending') return;
    let alive = true;
    const check = () => resetStatus(profileId).then(v => { if (alive && v !== 'pending') setSt(v); }).catch(() => {});
    void check(); const t = setInterval(check, 10_000);
    return () => { alive = false; clearInterval(t); };
  }, [st, profileId]);
  const mates = profiles.filter(p => p.id !== profileId).map(p => p.name).join(' ou ');
  if (st === 'closed') return <button type="button" className="link-like forgot" onClick={() => setSt('none')}>Code oublié ?</button>;
  const ask = async () => { setBusy(true); setErr(''); try { await askReset(profileId); setSt('pending'); } catch (e) { setErr((e as Error).message === 'réseau' ? 'Serveur injoignable.' : (e as Error).message); } setBusy(false); };
  const finish = async () => {
    setErr(''); if (c1.trim().length < 4) return setErr('Au moins 4 caractères.'); if (c1 !== c2) return setErr('Les deux codes ne sont pas identiques.');
    setBusy(true); try { const r = await finishReset(profileId, c1); if (r.ok) onDone(); else setErr(r.error); } catch (e) { setErr((e as Error).message); } setBusy(false);
  };
  return (
    <div className="forgot-box" onClick={e => e.stopPropagation()}>
      <KeyRound size={16} />
      {st === 'none' && <><p>Pas de panique : {mates} peut accepter une réinitialisation depuis sa page. Ta progression est conservée.</p><button type="button" className="primary" disabled={busy} onClick={() => void ask()}>Demander à un coéquipier</button></>}
      {st === 'pending' && <p>Demande envoyée ✓ Dès que {mates} l’accepte, tu pourras choisir un nouveau code ici (reste sur cet appareil). Valable 48 h.</p>}
      {st === 'approved' && <>
        <p>C’est accepté ! Choisis ton nouveau code :</p>
        <input type="password" value={c1} onChange={e => setC1(e.target.value)} placeholder="Nouveau code" />
        <input type="password" value={c2} onChange={e => setC2(e.target.value)} placeholder="Confirme le nouveau code" />
        <button type="button" className="primary" disabled={busy} onClick={() => void finish()}>Enregistrer et entrer</button>
      </>}
      {err && <p className="warn">{err}</p>}
    </div>
  );
}

/** Demandes de réinitialisation des coéquipiers, à accepter. */
function ResetRequests({ profileId }: { profileId: number }) {
  const [reqs, setReqs] = useState<{ profile_id: number; approved_at: string | null }[]>([]);
  const [msg, setMsg] = useState('');
  useEffect(() => {
    let alive = true;
    const load = () => listResetRequests(profileId).then(r => { if (alive) setReqs(r); }).catch(() => {});
    void load(); const t = setInterval(load, 30_000);
    return () => { alive = false; clearInterval(t); };
  }, [profileId]);
  const pend = reqs.filter(r => !r.approved_at);
  if (!pend.length && !msg) return null;
  return (
    <div className="share-banner reset-banner">
      <KeyRound size={18} />
      {msg ? <span>{msg}</span> : pend.map(r => {
        const p = profiles.find(x => x.id === r.profile_id)!;
        return <span key={r.profile_id} className="reset-item"><strong>{p.name} a oublié son code</strong> et demande une réinitialisation (sa progression est conservée).
          <button className="primary" onClick={async () => { try { await approveReset(profileId, p.id); setMsg(`✓ Accepté : ${p.name} peut maintenant choisir un nouveau code sur son appareil.`); setReqs(reqs.filter(x => x.profile_id !== p.id)); } catch (e) { setMsg('Impossible : ' + (e as Error).message); } }}>Accepter</button></span>;
      })}
      {msg && <button onClick={() => setMsg('')}>OK</button>}
    </div>
  );
}

/** Sauvegarde de la progression dans un fichier, et restauration. */
function BackupItems({ profileId }: { profileId: number }) {
  const [msg, setMsg] = useState('');
  const save = () => {
    const b = exportProfile(profileId); const p = profiles.find(x => x.id === profileId)!;
    const url = URL.createObjectURL(new Blob([JSON.stringify(b)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = `zero-to-hero-${p.name.toLowerCase()}-${b.exportedAt.slice(0, 10)}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMsg(`✓ ${b.entries.length} éléments sauvegardés`);
  };
  const restore = (f: File) => f.text().then(t => { const n = importProfile(profileId, JSON.parse(t)); setMsg(n ? `✓ ${n} éléments restaurés` : "✓ Déjà à jour : rien de plus récent dans ce fichier"); }).catch(e => setMsg('✗ ' + ((e as Error).message || 'fichier illisible')));
  return <>
    <button onClick={save}><Save size={15} /> Sauvegarder ma progression (fichier)</button>
    <label className="file-btn"><Upload size={15} /> Restaurer une sauvegarde<input type="file" accept="application/json,.json" onChange={e => { const f = e.target.files?.[0]; if (f) void restore(f); e.target.value = ''; }} /></label>
    {msg && <small className="meta">{msg}</small>}
  </>;
}

/** Après un rechargement, l'overlay (mini-fenêtre) s'est fermé : on propose de le rouvrir en un clic.
    Et si une nouvelle version attend la fermeture de l'overlay, on le signale. */
function OverlayBanner({ profileId }: { profileId: number }) {
  const { wasOpen, open, updatePending } = useOverlayState();
  if (wasOpen) return (
    <div className="share-banner ov-banner">
      <PictureInPicture2 size={18} />
      <span><strong>L’overlay s’est fermé</strong> avec le rechargement de la page.</span>
      <button className="primary" onClick={() => openOverlay(profileId)}>Rouvrir l’overlay</button>
      <button onClick={forgetReopen}>Non merci</button>
    </div>
  );
  if (open && updatePending) return (
    <div className="share-banner ov-banner soft">
      <Sparkles size={18} />
      <span>Une nouvelle version du site est prête. Elle s’installera quand tu fermeras l’overlay, pour ne pas le faire disparaître en pleine partie.</span>
      <button onClick={applyNow}>Installer maintenant</button>
    </div>
  );
  return null;
}

/** Bouton clair / sombre (retenu sur l'appareil). */
function ThemeToggle() {
  const [theme, setTheme] = useState(() => document.body.dataset.theme ?? 'light');
  const flip = () => { const t = theme === 'dark' ? 'light' : 'dark'; setTheme(t); document.body.dataset.theme = t; try { localStorage.setItem('fzth:v2:theme', t); } catch { /* ignore */ } };
  return <button className="theme-toggle" onClick={flip} title={theme === 'dark' ? 'Passer en thème clair' : 'Passer en thème sombre'}>{theme === 'dark' ? <Sun /> : <Moon />}</button>;
}

/** Les 3 personnages côte à côte avec leur avancée (Dofus terminés et quêtes validées). */
function TeamStrip({ profileId, isDone }: { profileId: number; isDone: (p: number, id: string) => boolean }) {
  const { team } = teamInfo();
  return (
    <div className="team-strip">
      {profiles.map(p => {
        const known = p.id === profileId || team[p.id];
        let total = 0, done = 0, eggs = 0;
        if (known) for (const raw of catalog) {
          const v = viewFor(raw, p.id, isDone); const n = v.itemIds.filter(id => isDone(p.id, id)).length;
          total += v.itemIds.length; done += n; if (v.itemIds.length && n === v.itemIds.length) eggs++;
        }
        const pct = total ? Math.round((done / total) * 100) : 0;
        return (
          <div key={p.id} className={`ts-card${p.id === profileId ? ' me' : ''}`} data-world={p.world}>
            <img src={`${import.meta.env.BASE_URL}persos/${p.image}`} alt="" />
            <div className="ts-info">
              <strong>{p.name}</strong>
              <small>{p.classe}</small>
              {known ? <>
                <span className="ts-eggs"><Egg size={12} /> {eggs} Dofus · {pct} %</span>
                <span className="ts-bar"><i style={{ width: `${pct}%` }} /></span>
              </> : <small className="ts-hidden">Progression pas encore partagée</small>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Grille de tous les Dofus (Quêtes → Dofus). */
function DofusGrid({ profileId, isDone, onOpen }: { profileId: number; isDone: (p: number, id: string) => boolean; onOpen: (id: string) => void }) {
  const [filter, setFilter] = remember<'all' | 'doing' | 'todo' | 'done'>('fzth:v2:homeFilter', 'all');
  const stats = dofusInfo.map(d => {
    const raw = catalog.find(x => x.id === d.id);
    const c = raw && viewFor(raw, profileId, isDone);
    const done = c ? c.itemIds.filter(id => isDone(profileId, id)).length : 0;
    const pct = c && c.itemIds.length ? Math.round((done / c.itemIds.length) * 100) : 0;
    const next = c?.sections.flatMap(s => s.items).find(i => !isDone(profileId, i.id));
    return { d, c, pct, done, next, state: pct === 100 ? 'done' : done > 0 ? 'doing' : 'todo' };
  });
  const finished = stats.filter(x => x.state === 'done').length;
  const FILTERS: [typeof filter, string][] = [['all', 'Tous'], ['doing', 'En cours'], ['todo', 'Pas commencés'], ['done', 'Terminés']];
  return (
    <section className="home dofus-grid">
      <div className="home-head">
        <h2>Tous les Dofus <small>{finished}/{catalog.length} terminés</small></h2>
        <div className="row">{FILTERS.map(([k, l]) => <button key={k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>{l} <small>{k === 'all' ? stats.length : stats.filter(x => x.state === k).length}</small></button>)}</div>
      </div>
      <div className="grid">
        {stats.filter(x => filter === 'all' || x.state === filter).map(({ d, c, pct, next }) => {
          return (
            <button key={d.id} style={{ '--egg': eggColor(d.image) } as React.CSSProperties} className={`egg st-${pct === 100 ? 'done' : pct > 0 ? 'doing' : 'todo'}${c ? '' : ' soon'}${pct === 100 ? ' complete' : ''}`} onClick={() => onOpen(d.id)} title={next ? `${d.name}\nProchaine : ${next.name}` : d.name}>
              {d.image && <EggRing src={img(d.image)!} image={d.image} pct={pct} size={86} />}
              <span className="name">{d.name}</span>
              {c ? <small>{pct} %</small> : <span className="chip">bientôt</span>}
            </button>
          );
        })}
      </div>
    </section>
  );
}

/** « Aujourd'hui » : ce qu'on fait en se connectant, dans l'ordre d'une session de jeu. */
function Today({ profileId, isDone, onOpen }: { profileId: number; isDone: (p: number, id: string) => boolean; onOpen: (id: string) => void }) {
  // Reprendre : les Dofus commencés, les plus avancés d'abord.
  const doing = catalog.map(raw => {
    const v = viewFor(raw, profileId, isDone); const done = v.itemIds.filter(id => isDone(profileId, id)).length;
    return { raw, v, done, pct: v.itemIds.length ? Math.round((done / v.itemIds.length) * 100) : 0, next: v.sections.flatMap(x => x.items).find(i => !isDone(profileId, i.id)) };
  }).filter(x => x.done > 0 && x.pct < 100).sort((a, b) => b.pct - a.pct).slice(0, 3);
  const favs = repeatables.filter(q => isDone(profileId, favKey(q)));
  const repLeft = repTodo(repeatables, profileId, isDone);
  // Almanax du jour (gardé dans le navigateur, rechargé si besoin).
  const [alm, setAlm] = useState(() => cachedRange(parisToday(), 1)[0]);
  useEffect(() => {
    if (alm) return;
    let lvl = 200; try { lvl = Number(localStorage.getItem(`fzth:v2:almLevel:${profileId}`)) || 200; } catch { /* ignore */ }
    void fetchRange(parisToday(), 1, lvl).then(d => setAlm(d[0])).catch(() => {});
  }, [alm, profileId]);
  const offered = alm ? isDone(profileId, `alm-done:${alm.date}`) : false;
  return (
    <main className="today panel">
      <LastNote profileId={profileId} />
      <div className="today-top">
        <NowCard profileId={profileId} isDone={isDone} onOpen={onOpen} />
        <SessionCard profileId={profileId} isDone={isDone} />
      </div>
      <div className="today-grid">
        <section className="t-card">
          <h3><Egg size={17} /> Reprendre</h3>
          {doing.length ? <ul className="t-list">{doing.map(x => {
            const di = dofusInfo.find(d => d.id === x.raw.id);
            return (
              <li key={x.raw.id}>
                <button className="t-resume" onClick={() => onOpen(x.raw.id)} style={{ '--egg': eggColor(di?.image) } as React.CSSProperties}>
                  {di?.image && <EggRing src={img(di.image)!} image={di.image} pct={x.pct} size={46} stroke={4} />}
                  <span><strong>{x.raw.name} <small>{x.pct} %</small></strong><em>Prochaine : {x.next?.name}</em></span>
                  <ArrowRight size={16} />
                </button>
              </li>
            );
          })}</ul> : <p className="meta">Aucun Dofus commencé. <button className="link-like" onClick={() => onOpen('quetes/dofus')}>Choisir un Dofus</button></p>}
          <button className="link-like t-more" onClick={() => onOpen('quetes/dofus')}>Tous les Dofus →</button>
        </section>
        <section className="t-card">
          <h3><Repeat size={17} /> Répétables du jour {repLeft.length > 0 && <span className="badge inline">{repLeft.length}</span>}</h3>
          {favs.length ? <ul className="t-list">{favs.map(q => {
            const done = isDone(profileId, repKey(q));
            return (
              <li key={q.id} className={done ? 'done' : ''}>
                <label className="t-check"><input type="checkbox" checked={done} onChange={e => { if (!done) burst(e.currentTarget); toggle(profileId, repKey(q)); }} />
                  <span><strong>{q.n}</strong><em>{q.f === 'j' ? 'chaque jour' : 'chaque semaine'} · {q.z}</em></span></label>
              </li>
            );
          })}</ul> : <p className="meta">Mets une ⭐ aux quêtes répétables que tu fais : elles apparaîtront ici chaque jour.</p>}
          <button className="link-like t-more" onClick={() => onOpen('quetes/rep')}>{favs.length ? 'Gérer mes répétables →' : 'Choisir mes répétables →'}</button>
        </section>
        <section className="t-card">
          <h3><CalendarDays size={17} /> Almanax du jour</h3>
          {alm ? <>
            <label className={`t-alm${offered ? ' done' : ''}`}>
              <input type="checkbox" checked={offered} onChange={e => { if (!offered) burst(e.currentTarget); toggle(profileId, `alm-done:${alm.date}`); }} />
              {alm.tribute.item.image_urls?.icon && <img src={alm.tribute.item.image_urls.icon} alt="" />}
              <span><strong>{alm.tribute.quantity} × {alm.tribute.item.name}</strong><em>Offrande à Théodoran Ax</em></span>
            </label>
            <p className="t-bonus"><b>{alm.bonus.type.name}</b> {alm.bonus.description}</p>
          </> : <p className="meta">Almanax indisponible hors ligne pour l’instant.</p>}
          <button className="link-like t-more" onClick={() => onOpen('almanax')}>Calendrier Almanax →</button>
        </section>
      </div>
      <div className="today-team">
        <TeamStrip profileId={profileId} isDone={isDone} />
        <CallButton profileId={profileId} />
      </div>
      <div className="today-grid two">
        <Roulette profileId={profileId} isDone={isDone} onOpen={onOpen} />
        <NextActions profileId={profileId} isDone={isDone} onOpen={onOpen} />
      </div>
      <CatchUp profileId={profileId} isDone={isDone} onOpenDofus={name => { const c = catalog.find(x => x.name === name); if (c) onOpen(c.id); }} />
    </main>
  );
}

// Colonne des Dofus sur le côté de la page d'un Dofus : on passe de l'un à l'autre sans revenir à l'accueil.
function DofusRail({ current, profileId, isDone, onOpen }: { current: string; profileId: number; isDone: (p: number, id: string) => boolean; onOpen: (id: string) => void }) {
  useEffect(() => { document.querySelector('.rail .on')?.scrollIntoView({ block: 'nearest', inline: 'center' }); }, [current]);
  return (
    <nav className="rail panel" aria-label="Tous les Dofus">
      <h3 className="rail-title">Les Dofus</h3>
      {dofusInfo.map(d => {
        const raw = catalog.find(x => x.id === d.id);
        const v = raw && viewFor(raw, profileId, isDone);
        const pct = v && v.itemIds.length ? Math.round(v.itemIds.filter(id => isDone(profileId, id)).length / v.itemIds.length * 100) : 0;
        return (
          <button key={d.id} className={`rail-item${d.id === current ? ' on' : ''}${pct === 100 ? ' complete' : ''}${pct === 0 ? ' todo' : ''}`} onClick={() => onOpen(d.id)} title={`${d.name} · ${pct} %`}
            style={{ '--egg': eggColor(d.image) } as React.CSSProperties}>
            {d.image && <img src={img(d.image)} alt={d.name} loading="lazy" />}
            {pct === 100 && <span className="rail-check"><Check size={11} strokeWidth={3} /></span>}
            {pct > 0 && pct < 100 && <span className="rail-pct" style={{ '--p': pct } as React.CSSProperties} />}
          </button>
        );
      })}
    </nav>
  );
}

/** Statistiques d'objectifs (faits / total) par type, comme sur Tougli. */
const STAT_TYPES: { key: string; label: string; icon: typeof Swords; match: (i: ItemView) => boolean }[] = [
  { key: 'solo', label: 'Combats solo', icon: Swords, match: i => !!i.objectives?.some(o => o.type.startsWith('combat') && o.type.endsWith('solo')) },
  { key: 'groupe', label: 'Combats de groupe', icon: Users, match: i => !!i.objectives?.some(o => o.type.startsWith('combat') && o.type.endsWith('groupe')) },
  { key: 'donjon', label: 'Donjons', icon: Castle, match: i => !!i.dungeon?.name || !!i.objectives?.some(o => o.type === 'donjon') },
  { key: 'bashing', label: 'Bashing de monstres', icon: Skull, match: i => !!i.objectives?.some(o => o.type === 'bashing-mob') },
  { key: 'special', label: 'Horaires, songes, sorts…', icon: Clock4, match: i => !!i.objectives?.some(o => iconInfo(o.type).family === 'special') },
  { key: 'aide', label: 'Aide d’autres joueurs / classes', icon: Handshake, match: i => !!i.objectives?.some(o => iconInfo(o.type).family === 'aide') },
];

function DofusPage({ info, raw, profileId, hideDone, setHideDone, isDone, onBack }: {
  info: DofusInfo; raw?: DofusView; profileId: number; hideDone: boolean; setHideDone: (v: boolean) => void;
  isDone: (p: number, id: string) => boolean; onBack: () => void;
}) {
  const [tab, setTab] = useState<'quetes' | 'ressources'>('quetes');
  const dofus = raw && viewFor(raw, profileId, isDone);
  const picks = raw ? picksFor(raw, profileId, isDone) : {};
  const done = dofus ? dofus.itemIds.filter(id => isDone(profileId, id)).length : 0;
  const total = dofus?.itemIds.length ?? 0;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const [confirm, setConfirm] = useState<'' | 'all' | 'reset'>('');
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  const items = dofus ? dofus.sections.flatMap(s => s.items) : [];
  const uniq = [...new Map(items.map(i => [i.id, i])).values()];
  const stats = STAT_TYPES.map(t => { const l = uniq.filter(t.match); return { ...t, total: l.length, done: l.filter(i => isDone(profileId, i.id)).length }; }).filter(t => t.total);
  const next = items.find(i => !isDone(profileId, i.id));
  const bulk = (v: boolean) => { if (!dofus) return; for (const id of dofus.itemIds) toggle(profileId, id, v, { silent: true }); setConfirm(''); };
  const ask = (k: 'all' | 'reset') => { if (confirm === k) bulk(k === 'all'); else { setConfirm(k); setTimeout(() => setConfirm(c => (c === k ? '' : c)), 4000); } };
  // Regroupement des quêtes : par succès (comme Tougli) ou par étape du guide.
  const [groupBy, setGroupBy] = remember<GroupBy>(GROUP_KEY, 'succes');
  const [focus, setFocus] = remember<boolean>('fzth:v2:focus', false);
  const achD = useAchData();
  type Group = QuestGroup;
  const groups: Group[] = dofus ? groupQuests(dofus.sections, groupBy, achD) : [];
  const groupDone = (g: Group) => (g.ach && isDone(profileId, achKey(g.ach.id))) || g.items.every(i => isDone(profileId, i.id));
  const goTo = (id: string) => { setClosed(c => ({ ...c, [id]: false })); setTimeout(() => document.getElementById('sec-' + id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30); };
  return (
    <main className="dofus-page v2" style={{ '--egg': eggColor(info.image) } as React.CSSProperties}>
      {dofus && (
        <aside className="path-scroll" aria-label="Étapes du Dofus">
          <span className="roll top" /><span className="roll bottom" />
          <div className="path">
            {groups.filter(g => !(hideDone && groupDone(g))).map(sec => {
              const d = sec.items.filter(i => isDone(profileId, i.id)).length;
              const st = groupDone(sec) ? 'done' : sec.items.some(i => i.id === next?.id) ? 'current' : d ? 'started' : 'todo';
              return <button key={sec.id} className={`path-node ${st}${sec.ach ? ' ach' : ''}`} onClick={() => goTo(sec.id)} title={`${d}/${sec.items.length}`}><span>{sec.title}</span></button>;
            })}
            <span className={`path-egg${pct === 100 ? ' done' : ''}`}>{info.image && <img src={img(info.image)} alt="" />}</span>
          </div>
        </aside>
      )}
      <section className="dp-center panel">
        <header className="dp-head">
          <button className="back" onClick={onBack}>← Tous les Dofus</button>
          {info.image && <img className="dp-egg" src={img(info.image)} alt="" />}
          <div className="dp-title">
            <h2>{info.name}</h2>
            <div className="dp-badges">
              {info.level && <span className="badge-pill lvl"><TrendingUp size={13} /> Niveau {info.level}</span>}
              {dofus?.kamas && <span className="badge-pill kamas"><Coins size={13} /> {dofus.kamas.total.toLocaleString('fr-FR')} K{dofus.kamas.complete ? '' : '+'}</span>}
              {info.stats.map(st => <span key={st} className="badge-pill stat">{st}</span>)}
              {dofus?.url && <a href={dofus.url} target="_blank" rel="noreferrer" className="badge-pill link">DPLN ↗</a>}
            </div>
            {info.effect && <p className="effect">{info.effect}</p>}
          </div>
        </header>
        {dofus && focus ? (() => {
          const seen = new Set<string>();
          const nx = groups.flatMap(g => g.items).filter(i => !isDone(profileId, i.id) && !seen.has(i.id) && seen.add(i.id)).slice(0, 3);
          return (
            <div className="focus-mode">
              <div className="focus-head">
                <span><Target size={18} /> Mode focus <small>{done}/{total} · {pct} %</small></span>
                <button onClick={() => setFocus(false)}>Tout afficher</button>
              </div>
              {nx.length ? <ul className="dp-quests focus-list">{nx.map((i, n) => <QuestRow key={i.id} item={i} done={false} next={n === 0} profileId={profileId} onToggle={() => toggle(profileId, i.id)} />)}</ul>
                : <p className="done-all">🎉 Plus rien à faire sur ce Dofus !</p>}
              <p className="meta small center">Seulement la quête en cours et les 2 suivantes. Les autres réapparaissent au fur et à mesure.</p>
            </div>
          );
        })() : dofus ? <>
          <div className="dp-stats">
            <div className="dp-ring" style={{ '--p': pct } as React.CSSProperties}>
              <strong>{pct}%</strong><span>Complété</span><b>{done}/{total}</b><small>Objectifs</small>
            </div>
            <div className="dp-tiles">{stats.map(t => (
              <div key={t.key} className={`dp-tile${t.done === t.total ? ' full' : ''}`} title={t.label}>
                <t.icon size={20} /><span><strong>{t.done}</strong><small>{t.total}</small></span>
              </div>
            ))}</div>
          </div>
          <div className="dp-actions">
            <button className="ok-btn" onClick={() => ask('all')}><Check size={15} /> {confirm === 'all' ? 'Confirmer ?' : 'Tout valider'}</button>
            <button className="danger-btn" onClick={() => ask('reset')}><RotateCcw size={15} /> {confirm === 'reset' ? 'Confirmer ?' : 'Réinitialiser'}</button>
            <button className="focus-btn" onClick={() => setFocus(true)} title="N’afficher que la quête en cours et les 2 suivantes"><Target size={15} /> Mode focus</button>
            <span className="grow" />
            <span className="seg" role="group" aria-label="Ranger les quêtes">
              <button className={groupBy === 'succes' ? 'on' : ''} onClick={() => setGroupBy('succes')}><Trophy size={14} /> Par succès</button>
              <button className={groupBy === 'etapes' ? 'on' : ''} onClick={() => setGroupBy('etapes')}><ListOrdered size={14} /> Par étape</button>
            </span>
            <label className="toggle" title="Cache les quêtes faites et les succès déjà obtenus"><input type="checkbox" checked={hideDone} onChange={e => setHideDone(e.target.checked)} /> Masquer ce qui est fait</label>
          </div>
          {raw && !!raw.choices.length && (
            <div className="choices">
              <h3>Choix avant de commencer</h3>
              {raw.choices.map(c => (
                <label key={c.selector}>{c.label}
                  <select value={picks[c.selector]} onChange={e => setPick(raw, profileId, c.selector, e.target.value)}>
                    {c.options.map(o => <option key={o}>{o}</option>)}
                  </select>
                </label>
              ))}
            </div>
          )}
          <nav className="tabs mobile-only">
            <button className={tab === 'quetes' ? 'on' : ''} onClick={() => setTab('quetes')}>Quêtes & succès</button>
            <button className={tab === 'ressources' ? 'on' : ''} onClick={() => setTab('ressources')}>Ressources</button>
          </nav>
          <div className={`dp-sections${tab === 'ressources' ? ' hide-mobile' : ''}`}>
            {groups.map(sec => {
              if (hideDone && groupDone(sec)) return null;
              const list = hideDone ? sec.items.filter(i => !isDone(profileId, i.id)) : sec.items;
              const d = sec.items.filter(i => isDone(profileId, i.id)).length;
              const isClosed = closed[sec.id] ?? false;
              const achDone = !!sec.ach && isDone(profileId, achKey(sec.ach.id));
              return (
                <div key={sec.id} id={'sec-' + sec.id} className={`dp-section${sec.ach ? ' by-ach' : ''}`}>
                  {sec.ach ? (
                    <div className={`ach-head${achDone ? ' done' : ''}`}>
                      <Trophy size={16} />
                      <button className="ach-head-name" onClick={() => setClosed(c => ({ ...c, [sec.id]: !isClosed }))}>{sec.title} <small>{d}/{sec.items.length}{sec.ach.total > sec.items.length ? ` · ${sec.ach.total} objectifs au total` : ''}</small> {isClosed ? '▸' : '▾'}</button>
                      <span className="pts">{sec.ach.pts} pts</span>
                      <label className="ach-head-check" title="J’ai validé ce succès en jeu"><input type="checkbox" checked={achDone} onChange={e => { if (!achDone) burst(e.currentTarget, true); toggle(profileId, achKey(sec.ach!.id)); }} /> Succès obtenu</label>
                    </div>
                  ) : (
                    <button className="orn-title" onClick={() => setClosed(c => ({ ...c, [sec.id]: !isClosed }))}>
                      <span className="orn-line" /><span className="orn-text">{sec.title} <small>{d}/{sec.items.length}</small> {isClosed ? '▸' : '▾'}</span><span className="orn-line" />
                    </button>
                  )}
                  {!isClosed && (list.length ? (
                    <ul className="dp-quests">{list.map((i, n) => <QuestRow key={i.id} item={i} done={isDone(profileId, i.id)} grouped={!!i.group && list[n - 1]?.group === i.group} next={next?.id === i.id} profileId={profileId}
                      onToggle={() => toggle(profileId, i.id)} />)}</ul>
                  ) : <p className="meta center">✓ Tout est fait dans cette partie.</p>)}
                </div>
              );
            })}
          </div>
        </> : <p className="panel empty">Les quêtes de ce Dofus ne sont pas encore dans la base. Elles arriveront au fur et à mesure.</p>}
      </section>
      {dofus && <div className={`dp-res${tab === 'quetes' ? ' hide-mobile' : ''}`}><Resources key={`${profileId}:${dofus.id}`} dofus={dofus} profileId={profileId} isDone={isDone} /></div>}
    </main>
  );
}

function QuestList({ dofus, profileId, hideDone, setHideDone, isDone }: {
  dofus: DofusView; profileId: number; hideDone: boolean; setHideDone: (v: boolean) => void; isDone: (p: number, id: string) => boolean;
}) {
  const next = dofus.sections.flatMap(s => s.items).find(i => !isDone(profileId, i.id));
  const [compact, setCompact] = remember<boolean>('fzth:v2:compact', false);
  return (
    <section className={`detail panel${compact ? ' compact' : ''}`}>
      <div className="detail-head">
        <p className="meta">{next ? <>Prochaine : <strong>{next.name}</strong></> : <strong>Tout est fait !</strong>}</p>
        <div className="row">
          <label className="toggle"><input type="checkbox" checked={compact} onChange={e => setCompact(e.target.checked)} /> Compact</label>
          <label className="toggle"><input type="checkbox" checked={hideDone} onChange={e => setHideDone(e.target.checked)} /> Masquer les terminées</label>
        </div>
      </div>
      <div className="sections">
        {dofus.sections.map(s => {
          const items = hideDone ? s.items.filter(i => !isDone(profileId, i.id)) : s.items;
          if (!items.length) return null;
          return (
            <div key={s.id} className="section">
              <h3>{s.title} <small>{s.items.filter(i => isDone(profileId, i.id)).length}/{s.items.length}</small></h3>
              <ul>{items.map((i, n) => <QuestRow key={i.id} item={i} done={isDone(profileId, i.id)} grouped={!!i.group && items[n - 1]?.group === i.group} next={next?.id === i.id}
                onToggle={() => toggle(profileId, i.id)} />)}</ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}

const FAMILIES: [IconFamily, string][] = [['combat', 'Combats'], ['donjon', 'Donjons'], ['bashing', 'Bashing'], ['special', 'Spécial'], ['metier', 'Métiers'], ['aide', 'Aide / classes']];

function Needs({ dofus, profileId, isDone }: { dofus: DofusView; profileId: number; isDone: (p: number, id: string) => boolean }) {
  const req = requirements(dofus, id => isDone(profileId, id));
  const any = FAMILIES.some(([f]) => req[f].length);
  const [open, setOpen] = remember<boolean>('fzth:v2:needsOpen', true);
  return (
    <details className="needs" open={open} onToggle={e => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary><h3>Ce que demande ce Dofus <small>(quêtes restantes)</small></h3></summary>
      {!any && <p className="meta">Plus rien à prévoir.</p>}
      {FAMILIES.map(([f, title]) => req[f].length ? (
        <div key={f} className="need-row">
          <span className="need-title">{title}</span>
          {req[f].map(e => (
            <span key={e.type + e.label} className={`chip obj f-${f}`} title={e.details.map(d => d.quest + (d.text ? ` (${d.text})` : '')).join('\n')}>
              {f === 'donjon' ? '⛫ ' + e.label : iconInfo(e.type).short}{f === 'combat' ? ` ×${e.count}` : e.count > 1 ? ` ×${e.count}` : ''}
            </span>
          ))}
        </div>
      ) : null)}
    </details>
  );
}

function Resources({ dofus, profileId, isDone }: { dofus: DofusView; profileId: number; isDone: (p: number, id: string) => boolean }) {
  const [mult, setMult] = remember<number>(`fzth:v2:mult:${profileId}:${dofus.id}`, 1);
  const [showOwned, setShowOwned] = remember<boolean>('fzth:v2:showOwned', false);
  const [rtab, setRtab] = remember<'objets' | 'donjons'>('fzth:v2:resTab', 'objets');
  const { kamas, items } = resourceNeeds(dofus, id => isDone(profileId, id));
  const key = (name: string) => `res:${dofus.id}:${name}`;
  const owned = items.filter(r => isDone(profileId, key(r.name))).length;
  const shown = showOwned ? items : items.filter(r => !isDone(profileId, key(r.name)));
  const m = Math.max(1, mult || 1);
  // Donjons demandés par les quêtes de ce Dofus (une ligne par donjon, fait quand toutes ses quêtes le sont).
  const djs = new Map<string, { name: string; quests: ItemView[] }>();
  for (const i of [...new Map(dofus.sections.flatMap(x => x.items).map(i => [i.id, i])).values()]) {
    const names = [i.dungeon?.name, ...(i.objectives ?? []).filter(o => o.type === 'donjon' && o.label).map(o => o.label!)].filter(Boolean) as string[];
    for (const n of new Set(names)) { const e = djs.get(n) ?? { name: n, quests: [] }; e.quests.push(i); djs.set(n, e); }
  }
  const djList = [...djs.values()].map(d => ({ ...d, done: d.quests.every(q => isDone(profileId, q.id)) })).filter(d => showOwned || !d.done);
  return (
    <aside className="resources panel">
      <nav className="res-tabs">
        <button className={rtab === 'objets' ? 'on' : ''} onClick={() => setRtab('objets')}><Package size={16} /> Objets <small>{items.length - owned}</small></button>
        <button className={rtab === 'donjons' ? 'on' : ''} onClick={() => setRtab('donjons')}><Castle size={16} /> Donjons <small>{[...djs.values()].filter(d => !d.quests.every(q => isDone(profileId, q.id))).length}</small></button>
      </nav>
      <div className="res-head">
        <h3>{rtab === 'objets' ? 'Ressources' : 'Donjons'}</h3>
        {rtab === 'objets' && <label className="mult" title="Nombre de personnages">×<input type="number" min={1} max={99} value={mult} onChange={e => setMult(Math.min(99, Math.max(1, Number(e.target.value) || 1)))} /> pers.</label>}
      </div>
      <label className="toggle small"><input type="checkbox" checked={!showOwned} onChange={e => setShowOwned(!e.target.checked)} /> Masquer les complétés</label>
      {rtab === 'objets' ? (
        <ul className="res-cards">
          {kamas && <li className="res-card kamas"><span className="rc-ic"><Coins size={22} /></span><span className="rc-name"><strong>Kamas</strong><small>×{kamas.qty.toLocaleString('fr-FR')} / pers</small></span><span className="rc-qty">{(kamas.qty * m).toLocaleString('fr-FR')}</span></li>}
          {shown.map(r => {
            const have = isDone(profileId, key(r.name));
            return (
              <li key={r.name} className={`res-card${have ? ' done' : ''}`} title={r.quests.join(' · ')}>
                <span className="rc-ic"><ResIcon name={r.name} size={30} /></span>
                <span className="rc-name"><strong>{r.name}</strong><small>×{r.qty.toLocaleString('fr-FR')} / pers</small></span>
                <Mates id={key(r.name)} profileId={profileId} isDone={isDone} />
                {have && <OfferButton name={r.name} profileId={profileId} />}
                <span className="rc-qty">{(r.qty * m).toLocaleString('fr-FR')}</span>
                <input type="checkbox" checked={have} onChange={e => { if (!have) burst(e.currentTarget); toggle(profileId, key(r.name)); }} title="Je l’ai" />
              </li>
            );
          })}
          {!items.length && <li className="meta">Aucune ressource pour les quêtes restantes.</li>}
          {items.length > 0 && !shown.length && <li className="meta">🎉 Tout est réuni !</li>}
        </ul>
      ) : (
        <ul className="res-cards">
          {djList.map(d => (
            <li key={d.name} className={`res-card${d.done ? ' done' : ''}`} title={d.quests.map(q => q.name).join(' · ')}>
              <span className="rc-ic"><Castle size={22} /></span>
              <span className="rc-name"><strong>{d.name}</strong><small>{d.quests.length} quête{d.quests.length > 1 ? 's' : ''} : {d.quests[0].name}{d.quests.length > 1 ? '…' : ''}</small></span>
              {d.done && <Check size={18} className="ok-ic" />}
            </li>
          ))}
          {!djList.length && <li className="meta">{djs.size ? '🎉 Tous les donjons sont faits !' : 'Aucun donjon demandé.'}</li>}
        </ul>
      )}
    </aside>
  );
}

// Petit menu déroulant générique : se ferme en cliquant ailleurs.
function useDropdown() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest('.dd')) setOpen(false); };
    document.addEventListener('mousedown', close); return () => document.removeEventListener('mousedown', close);
  }, [open]);
  return [open, setOpen] as const;
}

/** « Installer l'appli » : invitation du navigateur, ou mode d'emploi sur iPhone. */
function InstallItem() {
  const { canPrompt, installed, ios } = useInstall();
  const [help, setHelp] = useState(false);
  if (installed) return null;
  if (canPrompt) return <button onClick={() => void install()}><Download size={15} /> Installer l’appli sur cet appareil</button>;
  if (ios) return <>
    <button onClick={() => setHelp(!help)}><Download size={15} /> Installer l’appli sur l’iPhone</button>
    {help && <small className="meta install-help">Dans Safari : bouton Partager <Share size={12} />, puis « Sur l’écran d’accueil ».</small>}
  </>;
  return null;
}

function MeMenu({ profile, onOverlay, onChange, onLogout }: { profile: (typeof profiles)[number]; onOverlay: () => void; onChange: () => void; onLogout: () => void }) {
  const [open, setOpen] = useDropdown();
  return (
    <div className="dd me-menu">
      <button className="me-btn" onClick={() => setOpen(!open)} title="Mon personnage">
        <img className="avatar big" src={`${import.meta.env.BASE_URL}persos/${profile.image}`} alt="" />
        <span className="me-name"><strong>{profile.name}</strong> <small>{profile.classe}</small></span> ▾
      </button>
      {open && (
        <div className="dd-menu panel">
          <button className="primary" onClick={() => { onOverlay(); setOpen(false); }}>⧉ Ouvrir l’overlay à côté de Dofus</button>
          <InstallItem />
          <BackupItems profileId={profile.id} />
          <button onClick={onChange}>⇄ Changer de personnage</button>
          <button onClick={onLogout}>⏻ Se déconnecter (oublier le code ici)</button>
          <small className="meta">Version du {new Date(__BUILD__).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</small>
        </div>
      )}
    </div>
  );
}

function SearchBox({ profileId, isDone, onOpenDofus }: { profileId: number; isDone: (p: number, id: string) => boolean; onOpenDofus: (id: string) => void }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useDropdown();
  const r = useMemo(() => search(q), [q]);
  return (
    <div className="dd search">
      <input type="search" value={q} placeholder="🔎 Rechercher une quête…" onChange={e => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
        onKeyDown={e => { if (e.key === 'Escape') { setQ(''); setOpen(false); } }} />
      {open && q.trim().length >= 2 && (
        <div className="dd-menu panel search-results">
          {r.dofus.map(d => <button key={d.id} className="sr-dofus" onClick={() => { onOpenDofus(d.id); setOpen(false); setQ(''); }}>🥚 {d.name}</button>)}
          {r.quests.map(h => {
            const done = isDone(profileId, h.item.id);
            return (
              <div key={h.item.id} className={`sr-row${done ? ' done' : ''}`}>
                <label><input type="checkbox" checked={done} onChange={() => toggle(profileId, h.item.id)} /> <span>{h.item.name}</span></label>
                {h.item.url && <a href={h.item.url} target="_blank" rel="noreferrer" title="Dofus pour les Noobs">↗</a>}
                <div className="sr-dofus-list">{h.dofus.map(d => <button key={d.id} className="chip" onClick={() => { onOpenDofus(d.id); setOpen(false); setQ(''); }} title={d.section}>{d.name}</button>)}</div>
              </div>
            );
          })}
          {!r.quests.length && !r.dofus.length && <p className="meta">Aucun résultat.</p>}
        </div>
      )}
    </div>
  );
}

function Journal({ profileId }: { profileId: number }) {
  useProgress(); // se met à jour à chaque coche
  const [open, setOpen] = useDropdown();
  const list = getHistory(profileId).slice(0, 40);
  const time = (iso: string) => { const d = new Date(iso); const today = new Date().toDateString() === d.toDateString(); return d.toLocaleString('fr-FR', today ? { hour: '2-digit', minute: '2-digit' } : { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); };
  return (
    <div className="dd">
      <button onClick={() => setOpen(!open)} title="Dernières actions"><History /></button>
      {open && (
        <div className="dd-menu panel journal">
          <h3>Dernières actions</h3>
          {list.map(h => (
            <div key={h.at + h.id} className="jr-row">
              <span className="t">{time(h.at)}</span>
              <span className={`a ${h.done ? 'on' : 'off'}`}>{h.done ? '✓' : '✗'}</span>
              <span className="l">{labelOf(h.id)}</span>
              <button onClick={() => undo(h)} title="Annuler cette action">↶</button>
            </div>
          ))}
          {!list.length && <p className="meta">Aucune action pour l’instant.</p>}
          <p className="meta small">Gardé sur cet appareil.</p>
        </div>
      )}
    </div>
  );
}

function Bell({ onOpenTools }: { onOpenTools: () => void }) {
  const { unseen, permission } = useNotifications();
  const [open, setOpen] = useDropdown();
  const [settings, setSettings] = useState(false);
  return (
    <div className="bell-wrap dd">
      <button className={`bell${unseen.length ? ' has' : ''}`} onClick={() => setOpen(!open)} title="Notifications de l’équipe"><BellIcon />{unseen.length > 0 && <span className="badge">{unseen.length}</span>}</button>
      {open && (
        <div className="bell-menu panel">
          <h3>Notifications <button className="bell-gear" onClick={() => setSettings(!settings)} title="Choisir les catégories">⚙</button></h3>
          {settings && (
            <div className="notif-settings">
              <p className="meta small">Bulles à afficher (la cloche garde tout) :</p>
              {CATS.map(c => (
                <label key={c.id} className="toggle small"><input type="checkbox" checked={!isMuted(c.id)} onChange={e => setMuted(c.id, !e.target.checked)} /> {c.icon} {c.label}</label>
              ))}
            </div>
          )}
          {unseen.length ? CATS.map(c => {
            const g = unseen.filter(n => catOf(n) === c.id); if (!g.length) return null;
            return (
              <details key={c.id} className="notif-group" open={g.length <= 3}>
                <summary>{c.icon} {c.label} <span className="badge">{g.length}</span></summary>
                {g.map(n => n.url ? <a key={n.id} href={n.url} target="_blank" rel="noreferrer">{n.text} ↗</a> : <span key={n.id} className="notif-res">{n.text}</span>)}
              </details>
            );
          }) : <p className="meta">Rien de nouveau.</p>}
          <div className="row">
            {unseen.length > 0 && <button onClick={() => { markAllSeen(); setOpen(false); }}>Tout marquer comme vu</button>}
            <button onClick={() => { onOpenTools(); setOpen(false); }}>Voir les stuffs</button>
          </div>
          {permission === 'default' && <button className="primary" onClick={() => void enableBrowserNotifications()}>Recevoir aussi les notifications du navigateur</button>}
          {permission === 'denied' && <p className="meta small">Notifications du navigateur bloquées : à réactiver dans les réglages du site.</p>}
        </div>
      )}
    </div>
  );
}

/** Une seule bulle par catégorie : la plus récente + « et N autres ». */
function Toasts() {
  const { toasts } = useNotifications();
  return (
    <div className="toasts">
      {CATS.map(c => {
        const g = toasts.filter(t => catOf(t) === c.id); if (!g.length) return null;
        const last = g.reduce((a, b) => (b.at > a.at ? b : a));
        return (
          <div key={c.id} className={`toast panel cat-${c.id}`}>
            <span className="toast-ic">{c.icon}</span>
            <span className="toast-body">
              <small>{c.label}{g.length > 1 ? ` · ${g.length} ${c.plural}` : ''}</small>
              <span>{last.text}</span>
            </span>
            {last.url && <a href={last.url} target="_blank" rel="noreferrer">Voir ↗</a>}
            <button onClick={() => dismissCat(c.id)} title="Fermer">✕</button>
          </div>
        );
      })}
    </div>
  );
}

function SyncBadge({ status, lastSync, pending }: { status: SyncStatus; lastSync: Date | null; pending: number }) {
  const txt: Record<SyncStatus, string> = {
    local: 'Sur cet appareil seulement', syncing: 'Synchronisation…',
    ok: `Sauvegardé${lastSync ? ' ' + lastSync.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}`,
    offline: `Hors ligne${pending ? ` — ${pending} en attente` : ''}`, badcode: 'Code refusé — reconnecte-toi',
  };
  return <span className={`sync ${status}`} title={txt[status]}>●<span className="sync-txt"> {txt[status]}</span></span>;
}

const STEP_TYPES = /^(combat|bashing|donjon|songe|dimension|anomalie|dalles|chasse)/;
export function QuestRow({ item, done, grouped, next, onToggle, profileId }: { item: ItemView; done: boolean; grouped?: boolean; next?: boolean; onToggle: () => void; profileId?: number }) {
  const objs = (item.objectives ?? []).filter(o => !(o.type === 'donjon' && item.dungeon?.name));
  // Étapes découpées : une quête « ×5 combats » se coche combat par combat (la quête se valide à la dernière étape).
  const steps = profileId === undefined || done ? [] : objs.map((o, k) => ({ o, k })).filter(({ o }) => o.count && o.count >= 2 && o.count <= 12 && STEP_TYPES.test(o.type));
  const stepKey = (k: number, n: number) => `step:${item.id}:${k}:${n}`;
  const allSteps = steps.flatMap(({ o, k }) => Array.from({ length: o.count! }, (_, n) => stepKey(k, n)));
  const tickStep = (sk: string, e: React.MouseEvent | React.ChangeEvent) => {
    const nowDone = !isDoneP(profileId!, sk); toggle(profileId!, sk);
    if (nowDone && allSteps.every(x => x === sk || isDoneP(profileId!, x))) { burst(e.currentTarget as Element); onToggle(); }
  };
  const sub = [item.tag, ...(item.notes ?? [])].filter(Boolean) as string[];
  return (
    <li className={`quest${done ? ' done' : ''}${next ? ' next' : ''}${item.group ? ' in-group' : ''}${grouped ? ' group-cont' : ''}`}>
      {item.hint && !grouped && <div className="q-hint">{item.group ? <Link2 size={12} /> : <Info size={12} />} {item.hint}</div>}
      <label className="line">
        <input type="checkbox" checked={done} onChange={e => { if (!done) burst(e.currentTarget); onToggle(); }} />
        <span className="q-main">
          <span className="qname">
            {item.kind === 'achievement' && <Trophy size={13} className="q-ach" />}
            {item.url ? <a href={item.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>{item.name}</a> : item.name}
            {item.toConfirm && <span className="q-warn" title="Lien ou donnée à confirmer">?</span>}
          </span>
          {sub.length > 0 && <span className="q-sub">{sub.join(' · ')}</span>}
        </span>
        <span className="q-tags">
          {item.dungeon?.name && <span className="q-tag dj" title={`Donjon : ${item.dungeon.name}`}><Castle size={14} /> {item.dungeon.name}</span>}
          {item.dungeon?.captureOcre && <span className="q-dot ocre" title="Donjon à capturer pour le Dofus Ocre">Ocre</span>}
          {item.dungeon?.tourDuMonde && <span className="q-dot tdm" title="Donjon demandé dans le Tour du monde">TdM</span>}
          {objs.map((o, k) => {
            const ic = iconInfo(o.type); const I = tagIcon(o.type);
            const full = `${ic.label}${o.count ? ` ×${o.count}` : ''}${o.label ? ` : ${o.label}` : ''}`;
            return <span key={k} className={`q-tag f-${ic.family}`} title={full}><I size={14} />{o.count ? <b>{o.count}</b> : null}{o.type === 'donjon' && o.label ? ` ${o.label}` : ''}</span>;
          })}
          {item.level !== undefined && <span className="q-tag lvl" title="Niveau conseillé">{item.level}</span>}
          {item.kamas !== undefined && item.kamas > 0 && <span className="q-tag k" title="Kamas gagnés">{item.kamas.toLocaleString('fr-FR')} K</span>}
        </span>
        <ReportButton id={item.id} label={item.name} />
      </label>
      {steps.length > 0 && (
        <div className="q-steps">{steps.map(({ o, k }) => {
          const I = tagIcon(o.type);
          return (
            <span key={k} className="q-step-group" title={iconInfo(o.type).label}>
              <I size={13} />
              {Array.from({ length: o.count! }, (_, n) => { const sk = stepKey(k, n); const d = isDoneP(profileId!, sk); return (
                <button key={n} type="button" className={`q-step${d ? ' on' : ''}`} onClick={e => tickStep(sk, e)} aria-label={`${iconInfo(o.type).label} ${n + 1} sur ${o.count}`}>{d ? '✓' : n + 1}</button>
              ); })}
            </span>
          );
        })}</div>
      )}
    </li>
  );
}
