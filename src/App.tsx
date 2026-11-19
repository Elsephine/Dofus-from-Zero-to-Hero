import { useEffect, useState } from 'react';
import { catalog, type DofusView, type ItemView } from './model/catalog';
import { profiles } from './model/profiles';
import { getTeamCode, setTeamCode, toggle, useProgress, type SyncStatus } from './model/progress';
import { iconLegend } from './data/dom-de-pin';
import { dofusInfo, type DofusInfo } from './data/tougli/dofus-info';
import { resourceNeeds } from './model/resources';

const remember = <T,>(k: string, def: T): [T, (v: T) => void] => {
  const [v, setV] = useState<T>(() => { try { const r = localStorage.getItem(k); return r === null ? def : JSON.parse(r); } catch { return def; } });
  return [v, (n: T) => { setV(n); try { localStorage.setItem(k, JSON.stringify(n)); } catch { /* ignore */ } }];
};

const ICON_SHORT: Record<string, string> = {
  'combat-solo': '⚔ solo', 'combat-groupe': '⚔ groupe', 'combat-tactique-solo': '♟ tactique', 'combat-vague-solo': '≋ vagues',
  'combat-vague-groupe': '≋ vagues groupe', donjon: '⛫ donjon', 'bashing-mob': '✦ bashing', dimension: '◈ dimension', anomalie: '⚠ anomalie',
  'horaires-stricts': '⏱ horaires', 'besoin-sort': '✧ sort', songe: '☁ songe', caracteristiques: '★ carac.',
};
const LABEL = Object.fromEntries(iconLegend.map(i => [i.id, i.label]));

export function App() {
  const { status, lastSync, pendingCount, isDone } = useProgress();
  const [profileId, setProfileId] = remember<number>('fzth:v2:profile', 0);
  const [view, setView] = remember<string>('fzth:v2:view', 'home');
  const [hideDone, setHideDone] = remember<boolean>('fzth:v2:hideDone', false);
  const [showSettings, setShowSettings] = useState(false);
  const profile = profiles.find(p => p.id === profileId) ?? profiles[0];
  const info = dofusInfo.find(d => d.id === view);

  useEffect(() => { document.body.dataset.world = profile.world; }, [profile.world]);

  return (
    <div className="app">
      <header className="top">
        <h1><button className="home-link" onClick={() => setView('home')}><span className="sym">{profile.symbol}</span> From Zero to Hero</button></h1>
        <nav className="profiles">
          {profiles.map(p => (
            <button key={p.id} className={p.id === profile.id ? 'on' : ''} data-world={p.world} onClick={() => setProfileId(p.id)}>
              {p.symbol} {p.name} <small>{p.classe}</small>
            </button>
          ))}
        </nav>
        <SyncBadge status={status} lastSync={lastSync} pending={pendingCount} onClick={() => setShowSettings(true)} />
      </header>

      {info
        ? <DofusPage info={info} dofus={catalog.find(c => c.id === info.id)} profileId={profile.id} hideDone={hideDone} setHideDone={setHideDone} isDone={isDone} onBack={() => setView('home')} />
        : <Home profileId={profile.id} isDone={isDone} onOpen={setView} />}

      {showSettings && <Settings onClose={() => setShowSettings(false)} status={status} />}
    </div>
  );
}

const img = (file: string | null) => (file ? `${import.meta.env.BASE_URL}dofus/${file}` : undefined);

function Home({ profileId, isDone, onOpen }: { profileId: number; isDone: (p: number, id: string) => boolean; onOpen: (id: string) => void }) {
  return (
    <main className="home panel">
      <h2>Tous les Dofus</h2>
      <div className="grid">
        {dofusInfo.map(d => {
          const c = catalog.find(x => x.id === d.id);
          const done = c ? c.itemIds.filter(id => isDone(profileId, id)).length : 0;
          const pct = c && c.itemIds.length ? Math.round((done / c.itemIds.length) * 100) : 0;
          return (
            <button key={d.id} className={`egg${c ? '' : ' soon'}${pct === 100 ? ' complete' : ''}`} onClick={() => onOpen(d.id)} title={d.name}>
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

function DofusPage({ info, dofus, profileId, hideDone, setHideDone, isDone, onBack }: {
  info: DofusInfo; dofus?: DofusView; profileId: number; hideDone: boolean; setHideDone: (v: boolean) => void;
  isDone: (p: number, id: string) => boolean; onBack: () => void;
}) {
  const [tab, setTab] = useState<'quetes' | 'ressources'>('quetes');
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
            {!!dofus?.requiresDofus?.length && <> · Inclut : {dofus.requiresDofus.join(', ')}</>}
          </p>
          <div className="stats">{info.stats.map(s => <span key={s} className="chip stat">{s}</span>)}</div>
          {info.effect && <p className="effect">{info.effect}</p>}
          {dofus && <span className="bar big"><span style={{ width: `${total ? (done / total) * 100 : 0}%` }} /></span>}
        </div>
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
  return (
    <section className="detail panel">
      <div className="detail-head">
        <p className="meta">{next ? <>Prochaine : <strong>{next.name}</strong></> : <strong>Tout est fait !</strong>}</p>
        <label className="toggle"><input type="checkbox" checked={hideDone} onChange={e => setHideDone(e.target.checked)} /> Masquer les terminées</label>
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

function SyncBadge({ status, lastSync, pending, onClick }: { status: SyncStatus; lastSync: Date | null; pending: number; onClick: () => void }) {
  const txt: Record<SyncStatus, string> = {
    local: 'Local seulement — entrer le code d’équipe', syncing: 'Synchronisation…',
    ok: `Synchronisé${lastSync ? ' ' + lastSync.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}`,
    offline: `Hors ligne${pending ? ` — ${pending} en attente` : ''}`, badcode: 'Code d’équipe invalide',
  };
  return <button className={`sync ${status}`} onClick={onClick} title="Réglages de synchronisation">● {txt[status]}</button>;
}

function Settings({ onClose, status }: { onClose: () => void; status: SyncStatus }) {
  const [code, setCode] = useState(getTeamCode());
  return (
    <div className="modal" onClick={onClose}>
      <form className="panel" onClick={e => e.stopPropagation()} onSubmit={e => { e.preventDefault(); setTeamCode(code); onClose(); }}>
        <h2>Code d’équipe</h2>
        <p>Le même code pour Furionette, Volrod et Zepharyen. Sans code, les coches restent seulement sur cet appareil.</p>
        <input autoFocus value={code} onChange={e => setCode(e.target.value)} placeholder="Code d’équipe" />
        {status === 'badcode' && <p className="warn">Le code actuel est refusé par le serveur.</p>}
        <div className="row"><button type="button" onClick={onClose}>Annuler</button><button type="submit" className="primary">Enregistrer</button></div>
      </form>
    </div>
  );
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
          {item.objectives?.filter(o => !(o.type === 'donjon' && item.dungeon?.name)).map((o, k) => (
            <span key={k} className="chip obj" title={LABEL[o.type] ?? o.type}>
              {ICON_SHORT[o.type] ?? LABEL[o.type] ?? o.type}{o.count ? ` ×${o.count}` : ''}{o.label ? ` · ${o.label}` : ''}
            </span>
          ))}
          {item.level !== undefined && <span className="chip lvl">niv. {item.level}</span>}
          {item.kamas !== undefined && item.kamas > 0 && <span className="chip k">{item.kamas.toLocaleString('fr-FR')} K</span>}
        </span>
      </label>
    </li>
  );
}
