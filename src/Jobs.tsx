// Page « Métiers & ressources » : reprise de l'ancien site (6 métiers, liste globale, multiplicateur, cases à cocher par personnage).
import { useState } from 'react';
import { jobs, jobCrafts } from './data/metiers';
import { qtyOf, setQty, teamInfo, toggle } from './model/progress';
import { profiles } from './model/profiles';
import { post } from './model/messages';
import { Mates, OfferButton, ResIcon } from './Mates';

import { ALL_JOB_RES, jobKey } from './model/jobs';
import { ClaimButton } from './TeamLive';
const ALL = ALL_JOB_RES;
const key = jobKey;
const TOTAL = new Map(ALL.map(x => [key(x.name), x.qty])); // besoin total (tous métiers) par ressource

export function Jobs({ profileId, isDone }: { profileId: number; isDone: (p: number, id: string) => boolean }) {
  const lsMult = `fzth:v2:jobMult:${profileId}`;
  const [tab, setTab] = useState('global');
  const [mult, setMultState] = useState<number>(() => { try { return Number(localStorage.getItem(lsMult)) || 1; } catch { return 1; } });
  const [confirmReset, setConfirmReset] = useState(false);
  // Mode équipe : besoin × 3 personnages, et ce que chacun possède est additionné (« si j'ai 10 aubergines, il en reste 10 de moins à récolter pour l'équipe »).
  const [teamMode, setTeamModeState] = useState<boolean>(() => { try { return localStorage.getItem('fzth:v2:jobTeamMode') !== '0'; } catch { return true; } });
  const setTeamMode = (v: boolean) => { setTeamModeState(v); try { localStorage.setItem('fzth:v2:jobTeamMode', v ? '1' : '0'); } catch { /* ignore */ } };
  const [copied, setCopied] = useState('');
  // Ressources finalisées masquées par défaut pour libérer de la place.
  const [showDone, setShowDoneState] = useState<boolean>(() => { try { return localStorage.getItem('fzth:v2:showDoneRes') === '1'; } catch { return false; } });
  const setShowDone = (v: boolean) => { setShowDoneState(v); try { localStorage.setItem('fzth:v2:showDoneRes', v ? '1' : '0'); } catch { /* ignore */ } };
  const setMult = (v: number) => { const n = Math.min(999, Math.max(1, Math.floor(v) || 1)); setMultState(n); try { localStorage.setItem(lsMult, String(n)); } catch { /* ignore */ } };
  const { team } = teamInfo();
  const counted = profiles.filter(p => p.id === profileId || team[p.id]); // personnages dont on connaît les quantités
  const notShared = profiles.filter(p => p.id !== profileId && !team[p.id]);
  const factor = teamMode ? profiles.length : mult;
  const teamHave = (k: string) => counted.reduce((s, p) => s + (qtyOf(p.id, k) ?? 0), 0);
  const teamOk = (x: { name: string; qty: number }) => teamHave(key(x.name)) >= x.qty * factor;
  const done = teamMode ? ALL.filter(teamOk).length : ALL.filter(x => isDone(profileId, key(x.name))).length;
  const pct = Math.round((done / Math.max(1, ALL.length)) * 100);
  const finished = (name: string, qty: number) => { const k = key(name);
    return teamMode ? teamHave(k) >= qty * factor : isDone(profileId, k) || (qtyOf(profileId, k) ?? 0) >= qty * mult; };
  const doneToggle = (n: number) => n > 0 && (
    <label className="toggle show-done"><input type="checkbox" checked={showDone} onChange={e => setShowDone(e.target.checked)} /> Voir les ressources déjà obtenues ({n})</label>);
  const job = jobs.find(j => j.name === tab);
  const fmt = (q: number) => (q * mult).toLocaleString('fr-FR');

  const copy = async () => {
    // Liste de ce qui MANQUE (besoin total × multiplicateur − ce que j'ai), ressources réunies exclues.
    const txt = ALL.map(x => { const k = key(x.name); const need = x.qty * factor; const have = teamMode ? teamHave(k) : qtyOf(profileId, k) ?? 0;
      return (!teamMode && isDone(profileId, k)) || have >= need ? null : `${x.name} : ${(need - have).toLocaleString('fr-FR')}`; }).filter(Boolean).join('\n');
    try { await navigator.clipboard.writeText(txt); setCopied('Liste copiée !'); } catch { setCopied('Copie impossible ici'); }
    setTimeout(() => setCopied(''), 2000);
  };
  const reset = () => {
    if (!confirmReset) { setConfirmReset(true); setTimeout(() => setConfirmReset(false), 4000); return; }
    for (const x of ALL) toggle(profileId, key(x.name), false);
    setConfirmReset(false);
  };
  const me = profiles.find(p => p.id === profileId)!;
  const mates = profiles.filter(p => p.id !== profileId && team[p.id]);
  // need = besoin affiché (métier ou total) × multiplicateur ; « réunie » se calcule sur le besoin total de la ressource.
  const teamRow = (name: string, qty: number, title?: string) => {
    const k = key(name); const need = qty * factor; const have = teamHave(k); const mine = qtyOf(profileId, k);
    const ok = have >= need; const missing = Math.max(0, need - have);
    return (
      <div key={name} className={`res-card qty-card team-card${ok ? ' done' : ''}`} title={title}>
        <ResIcon name={name} />
        <span className="rname">{name}</span>
        <label className="have" title="Combien j’en ai, moi">
          <input type="number" min={0} inputMode="numeric" value={mine ?? ''} placeholder="j’ai…"
            onChange={e => setQty(profileId, k, Number(e.target.value), (TOTAL.get(k) ?? qty) * mult)} />
        </label>
        <span className="team-sum" title="Total de l’équipe / besoin pour les 3 personnages">
          <strong>{have.toLocaleString('fr-FR')}</strong> / {need.toLocaleString('fr-FR')}
        </span>
        {ok ? <span className="surplus">✓{have > need ? ` +${(have - need).toLocaleString('fr-FR')}` : ''}</span> : <span className="missing">−{missing.toLocaleString('fr-FR')}</span>}
        <span className="stock">
          {counted.filter(p => p.id !== profileId && (qtyOf(p.id, k) ?? 0) > 0).map(p => <span key={p.id} className="st-m" title={`${p.name} en a ${qtyOf(p.id, k)!.toLocaleString('fr-FR')}`}><img src={`${import.meta.env.BASE_URL}persos/${p.image}`} alt="" />{qtyOf(p.id, k)!.toLocaleString('fr-FR')}</span>)}
        </span>
        {!ok && <ClaimButton itemId={k} profileId={profileId} />}
        <span className="bar"><span style={{ width: `${Math.min(100, (have / Math.max(1, need)) * 100)}%` }} /></span>
      </div>
    );
  };
  const row = (name: string, qty: number, title?: string) => {
    if (teamMode) return teamRow(name, qty, title);
    const k = key(name); const d = isDone(profileId, k);
    const need = qty * mult; const total = (TOTAL.get(k) ?? qty) * mult;
    const have = qtyOf(profileId, k);
    const missing = have === undefined ? (d ? 0 : need) : Math.max(0, need - have);
    // Coéquipiers qui ont indiqué une quantité : le plus fourni est proposé pour la demande.
    const stock = mates.map(m => ({ m, q: qtyOf(m.id, k) ?? 0 })).filter(x => x.q > 0).sort((a, b) => b.q - a.q);
    const ask = () => {
      const best = stock[0];
      void post('text', `🙏 ${me.name} cherche ${missing.toLocaleString('fr-FR')} × ${name}${best ? ` — ${best.m.name}, tu en as ${best.q.toLocaleString('fr-FR')} : tu peux m’en passer ?` : ' : quelqu’un en a en surplus ?'}`, name);
    };
    return (
      <div key={name} className={`res-card qty-card${d ? ' done' : ''}`} title={title}>
        <input type="checkbox" checked={d} onChange={() => toggle(profileId, k)} title="J’ai tout" />
        <ResIcon name={name} />
        <span className="rname">{name}</span>
        <label className="have" title="Combien j’en ai">
          <input type="number" min={0} inputMode="numeric" value={have ?? ''} placeholder="j’ai…"
            onChange={e => setQty(profileId, k, Number(e.target.value), total)} />
          <span className="need">/ {need.toLocaleString('fr-FR')}</span>
        </label>
        {have !== undefined && !d && missing > 0 && <span className="missing" title="Il te manque">−{missing.toLocaleString('fr-FR')}</span>}
        {have !== undefined && have > total && <span className="surplus" title="Surplus par rapport à ton besoin total">+{(have - total).toLocaleString('fr-FR')}</span>}
        <span className="stock">
          {stock.map(({ m, q }) => <span key={m.id} className="st-m" title={`${m.name} en a ${q.toLocaleString('fr-FR')}`}><img src={`${import.meta.env.BASE_URL}persos/${m.image}`} alt="" />{q.toLocaleString('fr-FR')}</span>)}
          {!stock.length && <Mates id={k} profileId={profileId} isDone={isDone} />}
        </span>
        {!d && missing > 0 && (have !== undefined || stock.length > 0) && <button type="button" className="offer-btn" onClick={ask} title={stock[0] ? `Demander à ${stock[0].m.name}` : 'Demander à l’équipe'}>🙏</button>}
        {(d || (have !== undefined && have > total)) && <OfferButton name={name} profileId={profileId} />}
      </div>
    );
  };

  return (
    <main className="jobs panel">
      <p className="eyebrow">Craft manager</p>
      <h2>Métiers & ressources</h2>
      {teamMode && <p className="meta small team-note">Mode équipe : besoin pour monter les métiers sur les {profiles.length} personnages, moins tout ce que l’équipe possède déjà.
        {notShared.length > 0 && <span className="warn"> {notShared.map(p => p.name).join(' et ')} ne partage{notShared.length > 1 ? 'nt' : ''} pas encore sa progression : ses quantités ne sont pas comptées.</span>}</p>}
      <div className="job-stats">
        <div><strong>{jobs.length}</strong><span>métiers</span></div>
        <div><strong>{done} / {ALL.length}</strong><span>{teamMode ? 'réunies par l’équipe' : 'ressources validées'}</span></div>
        <div><strong>{pct} %</strong><span>progression</span></div>
        <div className="mode-switch">
          <button className={teamMode ? 'on' : ''} onClick={() => setTeamMode(true)} title="Besoin × 3 personnages, quantités de tous additionnées">👥 Équipe (×{profiles.length})</button>
          <button className={!teamMode ? 'on' : ''} onClick={() => setTeamMode(false)}>👤 Moi seul</button>
          {!teamMode && <label className="mult">×<input type="number" min={1} max={999} value={mult} onChange={e => setMult(Number(e.target.value))} /></label>}
        </div>
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
              <button className="primary" onClick={copy}>{copied || (teamMode ? 'Copier ce qui manque à l’équipe' : 'Copier ce qui me manque')}</button>
              <button onClick={reset}>{confirmReset ? 'Confirmer ?' : 'Réinitialiser les cases'}</button>
            </div>
          </div>
          <span className="bar big"><span style={{ width: `${pct}%` }} /></span>
          {doneToggle(ALL.filter(x => finished(x.name, x.qty)).length)}
          <div className="res-grid">{ALL.filter(x => showDone || !finished(x.name, x.qty)).map(x => row(x.name, x.qty, x.jobs.join(', ')))}</div>
          {!showDone && ALL.every(x => finished(x.name, x.qty)) && <p className="done-all">🎉 Toutes les ressources sont réunies !</p>}
        </section>
      ) : (
        <section>
          <div className="detail-head">
            <div><h3>{job.name} · niveau {job.target}</h3><p className="meta">{job.items.length} ressources distinctes pour ce métier</p></div>
          </div>
          <p className="notice">{job.note}</p>
          {jobCrafts[job.name] && (
            <details className="job-crafts" open>
              <summary>🔨 Crafts à faire ({jobCrafts[job.name].filter((_, i) => isDone(profileId, `craft:${job.name}:${i}`)).length}/{jobCrafts[job.name].length} paliers)</summary>
              <ul>{jobCrafts[job.name].map(([lv, item, n], i) => {
                const id = `craft:${job.name}:${i}`; const ok = isDone(profileId, id);
                return <li key={i} className={ok ? 'done' : ''}><label><input type="checkbox" checked={ok} onChange={() => toggle(profileId, id)} /><span className="lv">Niv. {lv}</span><strong>{n.toLocaleString('fr-FR')} ×</strong> <span>{item}</span></label></li>;
              })}</ul>
            </details>
          )}
          {doneToggle(job.items.filter(([n, q]) => finished(n, q)).length)}
          <div className="res-grid">{job.items.filter(([n, q]) => showDone || !finished(n, q)).map(([n, q]) => row(n, q))}</div>
          {!showDone && job.items.every(([n, q]) => finished(n, q)) && <p className="done-all">🎉 Tout est réuni pour ce métier !</p>}
        </section>
      )}

      <p className="meta small sources">
        Sources : {jobs.map((j, i) => <span key={j.name}>{i ? ' · ' : ''}<a href={j.source} target="_blank" rel="noreferrer">{j.name}</a></span>)}.
        {' '}Les guides donnent parfois des paliers complets plutôt qu’un niveau exact (voir les notes Bricoleur 31 et Sculpteur 10).
      </p>
    </main>
  );
}
