import { useEffect, useMemo, useState } from 'react';
import { catalog, type DofusView, type ItemView } from './model/catalog';
import { profiles } from './model/profiles';
import { getTeamCode, setTeamCode, toggle, useProgress, type SyncStatus } from './model/progress';
import { iconLegend } from './data/dom-de-pin';

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
  const [dofusId, setDofusId] = remember<string>('fzth:v2:dofus', catalog[0].id);
  const [hideDone, setHideDone] = remember<boolean>('fzth:v2:hideDone', false);
  const [showSettings, setShowSettings] = useState(false);
  const profile = profiles.find(p => p.id === profileId) ?? profiles[0];
  const dofus = catalog.find(d => d.id === dofusId) ?? catalog[0];

  useEffect(() => { document.body.dataset.world = profile.world; }, [profile.world]);

  return (
    <div className="app">
      <header className="top">
        <h1><span className="sym">{profile.symbol}</span> From Zero to Hero</h1>
        <nav className="profiles">
          {profiles.map(p => (
            <button key={p.id} className={p.id === profile.id ? 'on' : ''} data-world={p.world} onClick={() => setProfileId(p.id)}>
              {p.symbol} {p.name} <small>{p.classe}</small>
            </button>
          ))}
        </nav>
        <SyncBadge status={status} lastSync={lastSync} pending={pendingCount} onClick={() => setShowSettings(true)} />
      </header>

      <main className="layout">
        <aside className="journal panel">
          <h2>Journal des Dofus</h2>
          <ul>
            {catalog.map(d => {
              const done = d.itemIds.filter(id => isDone(profile.id, id)).length;
              const pct = d.itemIds.length ? Math.round((done / d.itemIds.length) * 100) : 0;
              return (
                <li key={d.id}>
                  <button className={`dofus-card${d.id === dofus.id ? ' on' : ''}${pct === 100 ? ' complete' : ''}`} onClick={() => setDofusId(d.id)}>
                    <span className="name">{d.name}</span>
                    <span className="count">{done}/{d.itemIds.length}</span>
                    <span className="bar"><span style={{ width: `${pct}%` }} /></span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <DofusDetail dofus={dofus} profileId={profile.id} hideDone={hideDone} setHideDone={setHideDone} isDone={isDone} />
      </main>

      {showSettings && <Settings onClose={() => setShowSettings(false)} status={status} />}
    </div>
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

function DofusDetail({ dofus, profileId, hideDone, setHideDone, isDone }: {
  dofus: DofusView; profileId: number; hideDone: boolean; setHideDone: (v: boolean) => void; isDone: (p: number, id: string) => boolean;
}) {
  const done = dofus.itemIds.filter(id => isDone(profileId, id)).length;
  const next = useMemo(() => dofus.sections.flatMap(s => s.items).find(i => !isDone(profileId, i.id)), [dofus, profileId, isDone, done]);
  return (
    <section className="detail panel">
      <div className="detail-head">
        <div>
          <h2>{dofus.name} {dofus.url && <a href={dofus.url} target="_blank" rel="noreferrer" className="dpln">DPLN ↗</a>}</h2>
          <p className="meta">
            {done}/{dofus.itemIds.length} objectifs
            {dofus.kamas && <> · {dofus.kamas.total.toLocaleString('fr-FR')} K{dofus.kamas.complete ? '' : ' (partiel)'}</>}
            {!!dofus.requiresDofus?.length && <> · Inclut : {dofus.requiresDofus.join(', ')}</>}
            {next && <> · Prochaine : <strong>{next.name}</strong></>}
          </p>
        </div>
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
