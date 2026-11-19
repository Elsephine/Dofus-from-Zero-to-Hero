// Page « Métiers & ressources » : reprise de l'ancien site (6 métiers, liste globale, multiplicateur, cases à cocher par personnage).
import { useState } from 'react';
import { jobs } from './data/metiers';
import { toggle } from './model/progress';

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const key = (name: string) => 'job:' + norm(name).replace(/[^a-z0-9]+/g, '-');

// Une ressource demandée par plusieurs métiers n'apparaît qu'une fois dans la liste globale (quantités additionnées).
function allItems() {
  const m = new Map<string, { name: string; qty: number; jobs: string[] }>();
  for (const j of jobs) for (const [n, q] of j.items) {
    const k = norm(n);
    if (!m.has(k)) m.set(k, { name: n, qty: 0, jobs: [] });
    const e = m.get(k)!; e.qty += q; e.jobs.push(j.name);
  }
  return [...m.values()].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}
const ALL = allItems();

export function Jobs({ profileId, isDone }: { profileId: number; isDone: (p: number, id: string) => boolean }) {
  const lsMult = `fzth:v2:jobMult:${profileId}`;
  const [tab, setTab] = useState('global');
  const [mult, setMultState] = useState<number>(() => { try { return Number(localStorage.getItem(lsMult)) || 1; } catch { return 1; } });
  const [confirmReset, setConfirmReset] = useState(false);
  const [copied, setCopied] = useState('');
  const setMult = (v: number) => { const n = Math.min(999, Math.max(1, Math.floor(v) || 1)); setMultState(n); try { localStorage.setItem(lsMult, String(n)); } catch { /* ignore */ } };
  const done = ALL.filter(x => isDone(profileId, key(x.name))).length;
  const pct = Math.round((done / Math.max(1, ALL.length)) * 100);
  const job = jobs.find(j => j.name === tab);
  const fmt = (q: number) => (q * mult).toLocaleString('fr-FR');

  const copy = async () => {
    const txt = ALL.map(x => `${x.name} : ${fmt(x.qty)}`).join('\n');
    try { await navigator.clipboard.writeText(txt); setCopied('Liste copiée !'); } catch { setCopied('Copie impossible ici'); }
    setTimeout(() => setCopied(''), 2000);
  };
  const reset = () => {
    if (!confirmReset) { setConfirmReset(true); setTimeout(() => setConfirmReset(false), 4000); return; }
    for (const x of ALL) toggle(profileId, key(x.name), false);
    setConfirmReset(false);
  };
  const row = (name: string, qty: number, title?: string) => {
    const k = key(name); const d = isDone(profileId, k);
    return (
      <label key={name} className={`res-card${d ? ' done' : ''}`} title={title}>
        <input type="checkbox" checked={d} onChange={() => toggle(profileId, k)} />
        <span className="rname">{name}</span>
        <span className="qty">{fmt(qty)}</span>
      </label>
    );
  };

  return (
    <main className="jobs panel">
      <p className="eyebrow">Craft manager</p>
      <h2>Métiers & ressources</h2>
      <div className="job-stats">
        <div><strong>{jobs.length}</strong><span>métiers</span></div>
        <div><strong>{done} / {ALL.length}</strong><span>ressources validées</span></div>
        <div><strong>{pct} %</strong><span>progression</span></div>
        <label className="mult">Multiplicateur ×<input type="number" min={1} max={999} value={mult} onChange={e => setMult(Number(e.target.value))} /></label>
      </div>
      <nav className="tabs always">
        <button className={tab === 'global' ? 'on' : ''} onClick={() => setTab('global')}>Tous les métiers</button>
        {jobs.map(j => <button key={j.name} className={tab === j.name ? 'on' : ''} onClick={() => setTab(j.name)}>{j.name} <small>{j.target}</small></button>)}
      </nav>

      {!job ? (
        <section>
          <div className="detail-head">
            <div><h3>Liste globale des ressources</h3><p className="meta">Regroupées entre tous les métiers pour éviter les doublons.</p></div>
            <div className="row">
              <button className="primary" onClick={copy}>{copied || 'Copier la liste'}</button>
              <button onClick={reset}>{confirmReset ? 'Confirmer ?' : 'Réinitialiser les cases'}</button>
            </div>
          </div>
          <span className="bar big"><span style={{ width: `${pct}%` }} /></span>
          <div className="res-grid">{ALL.map(x => row(x.name, x.qty, x.jobs.join(', ')))}</div>
        </section>
      ) : (
        <section>
          <div className="detail-head">
            <div><h3>{job.name} · niveau {job.target}</h3><p className="meta">{job.items.length} ressources distinctes pour ce métier</p></div>
          </div>
          <p className="notice">{job.note}</p>
          <div className="res-grid">{job.items.map(([n, q]) => row(n, q))}</div>
        </section>
      )}

      <p className="meta small sources">
        Sources : {jobs.map((j, i) => <span key={j.name}>{i ? ' · ' : ''}<a href={j.source} target="_blank" rel="noreferrer">{j.name}</a></span>)}.
        {' '}Les guides donnent parfois des paliers complets plutôt qu’un niveau exact (voir les notes Bricoleur 31 et Sculpteur 10).
      </p>
    </main>
  );
}
