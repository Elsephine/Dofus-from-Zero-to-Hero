import { useEffect, useMemo, useState } from 'react';
import { catalog, type DofusView, type ItemView } from './model/catalog';
import { profiles } from './model/profiles';
import { getHistory, hasCode, isUnlocked, login, logout, toggle, undo, useProgress, type SyncStatus } from './model/progress';
import { labelOf, search } from './model/search';
import { dofusInfo, type DofusInfo } from './data/tougli/dofus-info';
import { resourceNeeds } from './model/resources';
import { iconInfo, type IconFamily } from './model/icons';
import { requirements } from './model/requirements';
import { Tools } from './Tools';
import { Jobs } from './Jobs';
import { Almanax } from './Almanax';
import { Team } from './Team';
import { OverlayView, openOverlay } from './Overlay';
import { dismissToast, enableBrowserNotifications, markAllSeen, useNotifications, watchNotifications } from './model/notifications';
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
  useEffect(() => { watchNotifications(profile?.id ?? null); }, [profile?.id]);

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
      <header className="top">
        <h1><button className="home-link" onClick={() => setView('home')}><span className="sym">{profile.symbol}</span> From Zero to Hero</button></h1>
        <nav className="mainnav">
          <button className={!['tools', 'jobs', 'almanax', 'team'].includes(view) ? 'on' : ''} onClick={() => setView('home')}><span className="ic">🥚</span><span className="lbl">Dofus</span></button>
          <button className={view === 'jobs' ? 'on' : ''} onClick={() => setView('jobs')}><span className="ic">⚒</span><span className="lbl">Métiers</span></button>
          <button className={view === 'team' ? 'on' : ''} onClick={() => setView('team')}><span className="ic">👥</span><span className="lbl">Équipe</span></button>
          <button className={view === 'almanax' ? 'on' : ''} onClick={() => setView('almanax')}><span className="ic">📅</span><span className="lbl">Almanax</span></button>
          <button className={view === 'tools' ? 'on' : ''} onClick={() => setView('tools')}><span className="ic">🧰</span><span className="lbl">Outils</span></button>
        </nav>
        <SearchBox profileId={profile.id} isDone={isDone} onOpenDofus={id => setView(id)} />
        <Journal profileId={profile.id} />
        <Bell onOpenTools={() => setView('tools')} />
        <SyncBadge status={status} lastSync={lastSync} pending={pendingCount} />
        <MeMenu profile={profile} onOverlay={() => void openOverlay(profile.id, info?.id ?? lastDofus)} onChange={() => setActive(null)} onLogout={() => { logout(profile.id); setActive(null); }} />
      </header>
      <Toasts />

      {view === 'team' ? <Team profileId={profile.id} isDone={isDone} /> : view === 'tools' ? <Tools profileId={profile.id} /> : view === 'almanax' ? <Almanax profileId={profile.id} isDone={isDone} /> : view === 'jobs' ? <Jobs profileId={profile.id} isDone={isDone} /> : info
        ? <DofusPage info={info} raw={catalog.find(c => c.id === info.id)} profileId={profile.id} hideDone={hideDone} setHideDone={setHideDone} isDone={isDone} onBack={() => setView('home')} />
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
      <div className="home-head">
        <h2>Tous les Dofus <small>{finished}/{catalog.length} terminés</small></h2>
        <div className="row">{FILTERS.map(([k, l]) => <button key={k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>{l} <small>{k === 'all' ? stats.length : stats.filter(x => x.state === k).length}</small></button>)}</div>
      </div>
      <div className="grid">
        {stats.filter(x => filter === 'all' || x.state === filter).map(({ d, c, pct, next }) => {
          return (
            <button key={d.id} className={`egg${c ? '' : ' soon'}${pct === 100 ? ' complete' : ''}`} onClick={() => onOpen(d.id)} title={next ? `${d.name}\nProchaine : ${next.name}` : d.name}>
              {d.image && <img src={img(d.image)} alt="" loading="lazy" />}
              <span className="name">{d.name}</span>
              {c ? <span className="ring"><span style={{ width: `${pct}%` }} /></span> : <span className="chip">bientôt</span>}
              {c && <small>{pct} %</small>}
            </button>
          );
        })}
      </div>
    </main>
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
      <section className="reward panel">
        <button className="back" onClick={onBack}>← Tous les Dofus</button>
        {info.image && <img src={img(info.image)} alt="" />}
        <div className="reward-text">
          <h2>{info.name} {dofus?.url && <a href={dofus.url} target="_blank" rel="noreferrer" className="dpln">DPLN ↗</a>}</h2>
          <p className="meta">
            {info.level && <>Niveau recommandé {info.level}</>}
            {dofus && <> · {done}/{total} objectifs</>}
            {dofus?.kamas && <> · {dofus.kamas.total.toLocaleString('fr-FR')} K gagnés{dofus.kamas.complete ? '' : ' (partiel)'}</>}
          </p>
          <div className="stats">{info.stats.map(s => <span key={s} className="chip stat">{s}</span>)}</div>
          {info.effect && <p className="effect">{info.effect}</p>}
          {dofus && <span className="bar big"><span style={{ width: `${total ? (done / total) * 100 : 0}%` }} /></span>}
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
              <ul>{items.map((i, n) => <QuestRow key={i.id} item={i} done={isDone(profileId, i.id)} grouped={!!i.group && items[n - 1]?.group === i.group}
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
  const [hideOwned, setHideOwned] = remember<boolean>('fzth:v2:hideOwned', false);
  const { kamas, items } = resourceNeeds(dofus, id => isDone(profileId, id));
  const key = (name: string) => `res:${dofus.id}:${name}`;
  const owned = items.filter(r => isDone(profileId, key(r.name))).length;
  const shown = hideOwned ? items.filter(r => !isDone(profileId, key(r.name))) : items;
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
      <label className="toggle"><input type="checkbox" checked={hideOwned} onChange={e => setHideOwned(e.target.checked)} /> Masquer celles que j’ai</label>
      <ul className="res-list">
        {shown.map(r => {
          const have = isDone(profileId, key(r.name));
          return (
            <li key={r.name} className={have ? 'done' : ''}>
              <label title={r.quests.join(' · ')}>
                <input type="checkbox" checked={have} onChange={() => toggle(profileId, key(r.name))} />
                <span className="qty">{(r.qty * m).toLocaleString('fr-FR')}</span>
                <span className="rname">{r.name}</span>
              </label>
            </li>
          );
        })}
        {!items.length && <li className="meta">Aucune ressource pour les quêtes restantes.</li>}
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
      <button onClick={() => setOpen(!open)} title="Dernières actions">🕘</button>
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
  return (
    <div className="bell-wrap dd">
      <button className={`bell${unseen.length ? ' has' : ''}`} onClick={() => setOpen(!open)} title="Notifications de l’équipe">🔔{unseen.length > 0 && <span className="badge">{unseen.length}</span>}</button>
      {open && (
        <div className="bell-menu panel">
          <h3>Notifications</h3>
          {unseen.length ? unseen.map(n => <a key={n.id} href={n.url} target="_blank" rel="noreferrer">{n.text} ↗</a>) : <p className="meta">Rien de nouveau.</p>}
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

function Toasts() {
  const { toasts } = useNotifications();
  return (
    <div className="toasts">
      {toasts.map(t => (
        <div key={t.id} className="toast panel">
          <span>🛡️ {t.text}</span>
          <a href={t.url} target="_blank" rel="noreferrer">Voir ↗</a>
          <button onClick={() => dismissToast(t.id)}>✕</button>
        </div>
      ))}
    </div>
  );
}

function SyncBadge({ status, lastSync, pending }: { status: SyncStatus; lastSync: Date | null; pending: number }) {
  const txt: Record<SyncStatus, string> = {
    local: 'Sur cet appareil seulement', syncing: 'Synchronisation…',
    ok: `Sauvegardé${lastSync ? ' ' + lastSync.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}`,
    offline: `Hors ligne${pending ? ` — ${pending} en attente` : ''}`, badcode: 'Code refusé — reconnecte-toi',
  };
  return <span className={`sync ${status}`}>● {txt[status]}</span>;
}

export function QuestRow({ item, done, grouped, onToggle }: { item: ItemView; done: boolean; grouped?: boolean; onToggle: () => void }) {
  return (
    <li className={`quest${done ? ' done' : ''}${item.group ? ' in-group' : ''}${grouped ? ' group-cont' : ''}`}>
      {item.hint && <div className="hint">ℹ {item.hint}</div>}
      <label className="line">
        <input type="checkbox" checked={done} onChange={onToggle} />
        <span className="qname">
          {item.kind === 'achievement' && <span className="chip ach">Succès</span>}
          {item.url ? <a href={item.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>{item.name}</a> : item.name}
          {item.toConfirm && <span className="chip warn" title="Lien ou donnée à confirmer">?</span>}
        </span>
        <span className="chips">
          {item.dungeon?.captureOcre && <span className="chip ocre" title="Donjon à capturer pour le Dofus Ocre">Ocre</span>}
          {item.dungeon?.tourDuMonde && <span className="chip tdm" title="Donjon demandé dans le Tour du monde">Tour du monde</span>}
          {item.dungeon?.name && <span className="chip dj">⛫ {item.dungeon.name}</span>}
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
