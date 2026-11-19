import { useEffect, useMemo, useState } from 'react';
import { Bell as BellIcon, CalendarDays, Castle, Egg, Hammer, History, MessageCircle, Moon, Sparkles, Sun, Trophy, Users, Wrench, AlarmClock, Lightbulb } from 'lucide-react';
import { EggRing, eggColor } from './ui/EggRing';
import { burst, celebrateDofus, closeTrophy, useTrophy } from './model/celebrate';
import { catalog, type DofusView, type ItemView } from './model/catalog';
import { profiles } from './model/profiles';
import { getHistory, hasCode, isUnlocked, login, logout, teamInfo, toggle, undo, useProgress, type SyncStatus } from './model/progress';
import { labelOf, search } from './model/search';
import { dofusInfo, type DofusInfo } from './data/tougli/dofus-info';
import { resourceNeeds } from './model/resources';
import { iconInfo, type IconFamily } from './model/icons';
import { requirements } from './model/requirements';
import { Tools } from './Tools';
import { Mates, OfferButton, ResIcon } from './Mates';
import { Messages } from './Messages';
import { onNewMessages, post as postMessage, useMessages, watchMessages } from './model/messages';
import { Clock } from './Clock';
import { GoalBanner } from './Goals';
import { watchGoals } from './model/goals';
import { setPresencePage, watchTeamLive } from './model/teamlive';
import { OnlineNow } from './TeamLive';
import { Jobs } from './Jobs';
import { Achievements, eventStatus } from './Achievements';
import { almostDone, achKey, useAchData } from './model/achievements';
import { dungeonFor } from './TeamLive';
import { dungeonKeys } from './data/jeu/clefs';
import { Almanax } from './Almanax';
import { Team } from './Team';
import { OverlayView, openOverlay } from './Overlay';
import { CATS, catOf, dismissCat, enableBrowserNotifications, isMuted, markAllSeen, pushToasts, setMuted, useNotifications, watchNotifications } from './model/notifications';
import { picksFor, setPick, viewFor } from './model/choices';

const remember = <T,>(k: string, def: T): [T, (v: T) => void] => {
  const [v, setV] = useState<T>(() => { try { const r = localStorage.getItem(k); return r === null ? def : JSON.parse(r); } catch { return def; } });
  return [v, (n: T) => { setV(n); try { localStorage.setItem(k, JSON.stringify(n)); } catch { /* ignore */ } }];
};

export function App() {
  const { status, lastSync, pendingCount, isDone } = useProgress();
  const [active, setActive] = remember<number | null>('fzth:v2:active', null);
  const [view, setView] = remember<string>('fzth:v2:view', 'home');
  const [hideDone, setHideDone] = remember<boolean>('fzth:v2:hideDone', false);
  const [asking, setAsking] = useState<number | null>(null);
  const profile = active !== null && isUnlocked(active) ? profiles.find(p => p.id === active) : undefined;
  const info = dofusInfo.find(d => d.id === view);
  const [lastDofus, setLastDofus] = remember<string>('fzth:v2:lastDofus', 'dom-de-pin');
  useEffect(() => { if (info && info.id !== lastDofus) setLastDofus(info.id); }, [info?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { document.body.dataset.world = profile?.world ?? 'none'; }, [profile?.world]);
  useEffect(() => { watchNotifications(profile?.id ?? null); watchMessages(profile?.id ?? null); watchGoals(profile?.id ?? null); watchTeamLive(profile?.id ?? null); }, [profile?.id]);
  // Page affichée, visible par les coéquipiers (« Volrod · Dofus Cauchemar »).
  useEffect(() => {
    const labels: Record<string, string> = { home: 'Accueil', jobs: 'Métiers', team: 'Équipe', almanax: 'Almanax', messages: 'Messages', tools: 'Outils', succes: 'Succès' };
    setPresencePage(labels[view] ?? dofusInfo.find(d => d.id === view)?.name ?? 'Site');
  }, [view]);
  // Nouveaux messages des autres : message éphémère (+ notification du navigateur si autorisée), sauf si on est déjà sur la messagerie.
  useEffect(() => { const off = onNewMessages(ms => {
    if (view === 'messages') return;
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

  // Fenêtre overlay séparée (navigateurs sans mini-fenêtre) : #overlay
  if (location.hash === '#overlay' && profile) return <OverlayView profileId={profile.id} />;

  const open = (pid: number) => { if (isUnlocked(pid)) { setActive(pid); setView('home'); } else setAsking(pid); };

  if (!profile) {
    return (
      <div className="app landing">
        <h1 className="landing-title">From Zero to Hero</h1>
        <p className="landing-sub">Choisis ton personnage</p>
        <section className="team">
          {profiles.map(p => (
            <button key={p.id} className="portrait" data-world={p.world} onClick={() => open(p.id)}>
              <img src={`${import.meta.env.BASE_URL}persos/${p.image}`} alt={`Illustration de ${p.name}`} />
              <span className="portrait-info"><strong>{p.name}</strong><small>{p.classe}{isUnlocked(p.id) ? '' : ' · 🔒'}</small></span>
            </button>
          ))}
        </section>
        {asking !== null && <CodeDialog profileId={asking} onClose={() => setAsking(null)} onOk={() => { setActive(asking); setView('home'); setAsking(null); }} />}
      </div>
    );
  }

  return (
    <div className="app">
      <header className="top" style={{ '--hero': `url(${import.meta.env.BASE_URL}persos/${profile.image})` } as React.CSSProperties}>
        <h1><button className="home-link" onClick={() => setView('home')}><span className="sym">{profile.symbol}</span> From Zero to Hero</button></h1>
        <nav className="mainnav">
          <button className={!['tools', 'jobs', 'almanax', 'team', 'messages', 'succes'].includes(view) ? 'on' : ''} title="Dofus" onClick={() => setView('home')}><span className="ic"><Egg /></span><span className="lbl">Dofus</span></button>
          <button className={view === 'jobs' ? 'on' : ''} title="Métiers & ressources" onClick={() => setView('jobs')}><span className="ic"><Hammer /></span><span className="lbl">Métiers</span></button>
          <button className={view === 'succes' ? 'on' : ''} title="Succès" onClick={() => setView('succes')}><span className="ic"><Trophy /></span><span className="lbl">Succès</span></button>
          <button className={view === 'team' ? 'on' : ''} title="Équipe" onClick={() => setView('team')}><span className="ic"><Users /></span><span className="lbl">Équipe</span></button>
          <button className={view === 'almanax' ? 'on' : ''} title="Almanax" onClick={() => setView('almanax')}><span className="ic"><CalendarDays /></span><span className="lbl">Almanax</span></button>
          <button className={view === 'messages' ? 'on' : ''} title="Messages" onClick={() => setView('messages')}><span className="ic"><MessageCircle />{unread > 0 && <span className="badge">{unread}</span>}</span><span className="lbl">Messages</span></button>
          <button className={view === 'tools' ? 'on' : ''} title="Outils" onClick={() => setView('tools')}><span className="ic"><Wrench /></span><span className="lbl">Outils</span></button>
        </nav>
        <SearchBox profileId={profile.id} isDone={isDone} onOpenDofus={id => setView(id)} />
        <OnlineNow profileId={profile.id} />
        <Clock />
        <ThemeToggle />
        <Journal profileId={profile.id} />
        <Bell onOpenTools={() => setView('tools')} />
        <SyncBadge status={status} lastSync={lastSync} pending={pendingCount} />
        <MeMenu profile={profile} onOverlay={() => void openOverlay(profile.id, info?.id ?? lastDofus)} onChange={() => setActive(null)} onLogout={() => { logout(profile.id); setActive(null); }} />
      </header>
      {view !== 'team' && <GoalBanner profileId={profile.id} isDone={isDone} onOpen={() => setView('team')} />}
      <Toasts />
      <TrophyModal />

      {view === 'succes' ? <Achievements profileId={profile.id} isDone={isDone} /> : view === 'messages' ? <Messages profileId={profile.id} /> : view === 'team' ? <Team profileId={profile.id} isDone={isDone} /> : view === 'tools' ? <Tools profileId={profile.id} /> : view === 'almanax' ? <Almanax profileId={profile.id} isDone={isDone} /> : view === 'jobs' ? <Jobs profileId={profile.id} isDone={isDone} /> : info
        ? (
          <div className="with-rail">
            <DofusRail current={info.id} profileId={profile.id} isDone={isDone} onOpen={setView} />
            <DofusPage key={info.id} info={info} raw={catalog.find(c => c.id === info.id)} profileId={profile.id} hideDone={hideDone} setHideDone={setHideDone} isDone={isDone} onBack={() => setView('home')} />
          </div>
        )
        : <Home profileId={profile.id} isDone={isDone} onOpen={setView} />}
    </div>
  );
}

function CodeDialog({ profileId, onClose, onOk }: { profileId: number; onClose: () => void; onOk: () => void }) {
  const p = profiles.find(x => x.id === profileId)!;
  const [exists, setExists] = useState<boolean | null | undefined>(undefined); // undefined = en cours de vérification
  const [code, setCode] = useState(''); const [code2, setCode2] = useState('');
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { let alive = true; hasCode(profileId).then(v => { if (alive) setExists(v); }); return () => { alive = false; }; }, [profileId]);
  const creating = exists === false || exists === null;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    if (creating && exists === false && code !== code2) { setError('Les deux codes ne sont pas identiques.'); return; }
    setBusy(true); const r = await login(profileId, code); setBusy(false);
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
        {error && <p className="warn">{error}</p>}
        <div className="row"><button type="button" onClick={onClose}>Annuler</button><button type="submit" className="primary" disabled={busy || exists === undefined}>{exists === false ? 'Créer mon code' : 'Entrer'}</button></div>
      </form>
    </div>
  );
}

const img = (file: string | null) => (file ? `${import.meta.env.BASE_URL}dofus/${file}` : undefined);

/** « Aujourd'hui » : ce qui rapporte le plus avec ce qui est déjà commencé. */
function NextActions({ profileId, isDone, onOpen }: { profileId: number; isDone: (p: number, id: string) => boolean; onOpen: (id: string) => void }) {
  const d = useAchData();
  const { team } = teamInfo();
  const members = profiles.filter(p => p.id === profileId || team[p.id]);
  const [hidden, setHidden] = remember<string>('fzth:v2:nextHidden', '');
  const today = new Date().toISOString().slice(0, 10);
  if (hidden === today) return <button className="next-show" onClick={() => setHidden('')}>💡 Voir les idées du jour</button>;
  // Dofus le plus proche de la fin parmi ceux commencés
  const doing = catalog.map(raw => { const v = viewFor(raw, profileId, isDone); const left = v.sections.flatMap(s => s.items).filter(i => !isDone(profileId, i.id)); return { raw, v, left }; })
    .filter(x => x.left.length && x.left.length < x.v.itemIds.length).sort((a, b) => a.left.length - b.left.length);
  const close = doing[0];
  // Donjon de la prochaine quête d'un Dofus en cours
  let dj: { name: string; left: number; key?: string; dofus: string } | null = null;
  for (const x of doing) {
    const it = x.left[0]; const label = it.dungeon?.name ?? it.objectives?.find(o => o.type === 'donjon')?.label;
    const dd = label ? dungeonFor(label) : undefined;
    if (dd) { dj = { name: dd.name, left: dd.ach.filter(a => members.some(m => !isDone(m.id, achKey(a.id)))).length, key: dungeonKeys[dd.id]?.name, dofus: x.raw.id }; break; }
  }
  const almost = d ? almostDone(d, profileId, isDone)[0] : undefined;
  const ev = d ? eventStatus(d, profileId, isDone).find(x => x.days <= 30 && x.left.length) : undefined;
  const cards: JSX.Element[] = [];
  if (close) cards.push(<button key="dofus" className="next-card" onClick={() => onOpen(close.raw.id)}><span className="nc-ic"><Egg /></span><span><small>Dofus le plus proche</small><strong>{close.raw.name} : plus que {close.left.length} étape{close.left.length > 1 ? 's' : ''}</strong><em>Prochaine : {close.left[0].name}</em></span></button>);
  if (dj) cards.push(<button key="dj" className="next-card" onClick={() => onOpen('succes')}><span className="nc-ic"><Castle /></span><span><small>Donjon à préparer</small><strong>{dj.name}</strong><em>{dj.left} succès à cumuler en équipe{dj.key ? ` · 🗝 ${dj.key}` : ''}</em></span></button>);
  if (almost) cards.push(<button key="ach" className="next-card" onClick={() => onOpen('succes')}><span className="nc-ic"><Trophy /></span><span><small>Succès presque fini</small><strong>{almost.a.n}</strong><em>{almost.done}/{almost.total} objectifs · {almost.a.p} pts</em></span></button>);
  if (ev) cards.push(<button key="ev" className="next-card hot" onClick={() => onOpen('succes')}><span className="nc-ic"><AlarmClock /></span><span><small>{ev.days === 0 ? 'C’est la période' : `Dans ~${ev.days} jours`}</small><strong>Événement {ev.e.label}</strong><em>{ev.left.length} succès · {ev.pts} pts à prendre</em></span></button>);
  cards.push(<button key="alm" className="next-card" onClick={() => onOpen('almanax')}><span className="nc-ic"><CalendarDays /></span><span><small>Chaque jour</small><strong>Offrande Almanax</strong><em>Voir l’offrande et le bonus du jour</em></span></button>);
  return (
    <section className="next-actions">
      <h3><Lightbulb size={18} /> Aujourd’hui, je te propose <button className="link-like" onClick={() => setHidden(today)}>masquer pour aujourd’hui</button></h3>
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

function Home({ profileId, isDone, onOpen }: { profileId: number; isDone: (p: number, id: string) => boolean; onOpen: (id: string) => void }) {
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
    <main className="home panel">
      <TeamStrip profileId={profileId} isDone={isDone} />
      <NextActions profileId={profileId} isDone={isDone} onOpen={onOpen} />
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
    </main>
  );
}

// Colonne des Dofus sur le côté de la page d'un Dofus : on passe de l'un à l'autre sans revenir à l'accueil.
function DofusRail({ current, profileId, isDone, onOpen }: { current: string; profileId: number; isDone: (p: number, id: string) => boolean; onOpen: (id: string) => void }) {
  useEffect(() => { document.querySelector('.rail .on')?.scrollIntoView({ block: 'nearest', inline: 'center' }); }, [current]);
  return (
    <nav className="rail panel" aria-label="Tous les Dofus">
      {dofusInfo.map(d => {
        const raw = catalog.find(x => x.id === d.id);
        const v = raw && viewFor(raw, profileId, isDone);
        const pct = v && v.itemIds.length ? Math.round(v.itemIds.filter(id => isDone(profileId, id)).length / v.itemIds.length * 100) : 0;
        return (
          <button key={d.id} className={`rail-item${d.id === current ? ' on' : ''}${pct === 100 ? ' complete' : ''}`} onClick={() => onOpen(d.id)} title={`${d.name} · ${pct} %`}>
            {d.image && <img src={img(d.image)} alt="" loading="lazy" />}
            <span className="rail-text"><span className="rail-name">{d.name}</span><span className="bar"><span style={{ width: `${pct}%` }} /></span></span>
          </button>
        );
      })}
    </nav>
  );
}

function DofusPage({ info, raw, profileId, hideDone, setHideDone, isDone, onBack }: {
  info: DofusInfo; raw?: DofusView; profileId: number; hideDone: boolean; setHideDone: (v: boolean) => void;
  isDone: (p: number, id: string) => boolean; onBack: () => void;
}) {
  const [tab, setTab] = useState<'quetes' | 'ressources'>('quetes');
  const dofus = raw && viewFor(raw, profileId, isDone);
  const picks = raw ? picksFor(raw, profileId, isDone) : {};
  const done = dofus ? dofus.itemIds.filter(id => isDone(profileId, id)).length : 0;
  const total = dofus?.itemIds.length ?? 0;
  return (
    <main className="dofus-page">
      <section className="reward panel" style={{ '--egg': eggColor(info.image) } as React.CSSProperties}>
        <button className="back" onClick={onBack}>← Tous les Dofus</button>
        {info.image && <span className="reward-egg"><EggRing src={img(info.image)!} image={info.image} pct={total ? (done / total) * 100 : 0} size={124} stroke={6} /></span>}
        <div className="reward-text">
          <h2>{info.name} {dofus?.url && <a href={dofus.url} target="_blank" rel="noreferrer" className="dpln">DPLN ↗</a>}</h2>
          <p className="meta">
            {info.level && <>Niveau recommandé {info.level}</>}
            {dofus && <> · {done}/{total} objectifs</>}
            {dofus?.kamas && <> · {dofus.kamas.total.toLocaleString('fr-FR')} K gagnés{dofus.kamas.complete ? '' : ' (partiel)'}</>}
          </p>
          <div className="stats">{info.stats.map(s => <span key={s} className="chip stat">{s}</span>)}</div>
          {info.effect && <p className="effect">{info.effect}</p>}
          {dofus && <span className="bar big egg-bar"><span style={{ width: `${total ? (done / total) * 100 : 0}%` }} /></span>}
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
        {dofus && <Needs dofus={dofus} profileId={profileId} isDone={isDone} />}
      </section>

      {!dofus ? (
        <section className="panel empty">Les quêtes de ce Dofus ne sont pas encore dans la base. Elles arriveront au fur et à mesure.</section>
      ) : (
        <>
          <nav className="tabs">
            <button className={tab === 'quetes' ? 'on' : ''} onClick={() => setTab('quetes')}>Quêtes & succès</button>
            <button className={tab === 'ressources' ? 'on' : ''} onClick={() => setTab('ressources')}>Ressources nécessaires</button>
          </nav>
          <div className={`split show-${tab}`}>
            <QuestList dofus={dofus} profileId={profileId} hideDone={hideDone} setHideDone={setHideDone} isDone={isDone} />
            <Resources key={`${profileId}:${dofus.id}`} dofus={dofus} profileId={profileId} isDone={isDone} />
          </div>
        </>
      )}
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
  const { kamas, items } = resourceNeeds(dofus, id => isDone(profileId, id));
  const key = (name: string) => `res:${dofus.id}:${name}`;
  const owned = items.filter(r => isDone(profileId, key(r.name))).length;
  const shown = showOwned ? items : items.filter(r => !isDone(profileId, key(r.name)));
  const m = Math.max(1, mult || 1);
  return (
    <aside className="resources panel">
      <div className="detail-head">
        <div>
          <h3>Ressources nécessaires</h3>
          <p className="meta">{owned}/{items.length} réunies · quêtes restantes seulement</p>
        </div>
        <label className="mult">×<input type="number" min={1} max={99} value={mult} onChange={e => setMult(Math.min(99, Math.max(1, Number(e.target.value) || 1)))} /></label>
      </div>
      {kamas && <p className="kamas-need">Kamas à prévoir : <strong>{(kamas.qty * m).toLocaleString('fr-FR')} K</strong></p>}
      {owned > 0 && <label className="toggle"><input type="checkbox" checked={showOwned} onChange={e => setShowOwned(e.target.checked)} /> Voir les ressources déjà obtenues ({owned})</label>}
      <ul className="res-list">
        {shown.map(r => {
          const have = isDone(profileId, key(r.name));
          return (
            <li key={r.name} className={have ? 'done' : ''}>
              <label title={r.quests.join(' · ')}>
                <input type="checkbox" checked={have} onChange={() => toggle(profileId, key(r.name))} />
                <span className="qty">{(r.qty * m).toLocaleString('fr-FR')}</span>
                <ResIcon name={r.name} size={20} />
                <span className="rname">{r.name}</span>
                <Mates id={key(r.name)} profileId={profileId} isDone={isDone} />
                {have && <OfferButton name={r.name} profileId={profileId} />}
              </label>
            </li>
          );
        })}
        {!items.length && <li className="meta">Aucune ressource pour les quêtes restantes.</li>}
        {items.length > 0 && !shown.length && <li className="meta">🎉 Tout est réuni !</li>}
      </ul>
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

export function QuestRow({ item, done, grouped, next, onToggle }: { item: ItemView; done: boolean; grouped?: boolean; next?: boolean; onToggle: () => void }) {
  return (
    <li className={`quest${done ? ' done' : ''}${next ? ' next' : ''}${item.group ? ' in-group' : ''}${grouped ? ' group-cont' : ''}`}>
      {item.hint && <div className="hint">ℹ {item.hint}</div>}
      <label className="line">
        <input type="checkbox" checked={done} onChange={e => { if (!done) burst(e.currentTarget); onToggle(); }} />
        <span className="qname">
          {item.kind === 'achievement' && <span className="chip ach">Succès</span>}
          {item.url ? <a href={item.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>{item.name}</a> : item.name}
          {item.toConfirm && <span className="chip warn" title="Lien ou donnée à confirmer">?</span>}
        </span>
        <span className="chips">
          {item.dungeon?.captureOcre && <span className="chip ocre" title="Donjon à capturer pour le Dofus Ocre">Ocre</span>}
          {item.dungeon?.tourDuMonde && <span className="chip tdm" title="Donjon demandé dans le Tour du monde">Tour du monde</span>}
          {item.dungeon?.name && <span className="chip dj"><Castle size={12} /> {item.dungeon.name}</span>}
          {item.tag && <span className="chip">{item.tag}</span>}
          {item.objectives?.filter(o => !(o.type === 'donjon' && item.dungeon?.name)).map((o, k) => {
            const ic = iconInfo(o.type);
            return <span key={k} className={`chip obj f-${ic.family} t-${o.type}`} title={ic.label}>{ic.short}{o.count ? ` ×${o.count}` : ''}{o.label ? ` · ${o.label}` : ''}</span>;
          })}
          {item.notes?.map((n, k) => <span key={'n' + k} className="chip note">{n}</span>)}
          {item.level !== undefined && <span className="chip lvl">niv. {item.level}</span>}
          {item.kamas !== undefined && item.kamas > 0 && <span className="chip k">{item.kamas.toLocaleString('fr-FR')} K</span>}
        </span>
      </label>
    </li>
  );
}
