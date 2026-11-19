// Overlay à côté de Dofus : mini-fenêtre toujours au premier plan (Document Picture-in-Picture, Chrome / Edge),
// sinon petite fenêtre séparée. On y coche la prochaine quête sans quitter le jeu.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { catalog } from './model/catalog';
import { viewFor } from './model/choices';
import { profiles } from './model/profiles';
import { toggle, useProgress } from './model/progress';
import { iconInfo } from './model/icons';
import { ALL_JOB_RES, jobKey } from './model/jobs';
import { qtyOf, setQty, teamInfo } from './model/progress';
import { useTeamLive, setClaim } from './model/teamlive';
import { ResIcon } from './Mates';

const LS = 'fzth:v2:overlayDofus';
const HUNT = 'https://www.dofuspourlesnoobs.com/resolution-de-chasse-aux-tresors.html';

export function OverlayView({ profileId }: { profileId: number }) {
  const { isDone, status } = useProgress();
  const [mode, setModeState] = useState<'quetes' | 'ressources'>(() => { try { return (localStorage.getItem('fzth:v2:overlayMode') as 'ressources') ?? 'quetes'; } catch { return 'quetes'; } });
  const setMode = (m: 'quetes' | 'ressources') => { setModeState(m); try { localStorage.setItem('fzth:v2:overlayMode', m); } catch { /* ignore */ } };
  if (mode === 'ressources') return <OverlayResources profileId={profileId} status={status} onMode={setMode} />;
  return <OverlayQuests profileId={profileId} isDone={isDone} status={status} onMode={setMode} />;
}

const isPip = () => typeof window !== 'undefined' && location.hash !== '#overlay';
function NoPipNotice() {
  if (isPip()) return null;
  return <p className="ov-warn">⚠ Ce navigateur ne peut pas garder cette fenêtre au premier plan. Ouvre le site dans <strong>Chrome ou Edge sur ordinateur</strong> pour avoir l’overlay toujours visible au-dessus de Dofus.</p>;
}

function ModeTabs({ mode, onMode }: { mode: 'quetes' | 'ressources'; onMode: (m: 'quetes' | 'ressources') => void }) {
  return (
    <div className="ov-tabs">
      <button className={mode === 'quetes' ? 'on' : ''} onClick={() => onMode('quetes')}>📜 Quêtes</button>
      <button className={mode === 'ressources' ? 'on' : ''} onClick={() => onMode('ressources')}>🌾 Ressources</button>
    </div>
  );
}

/** Overlay « ressources de métiers » : ce qui manque, saisie rapide de ce qu'on a récolté (+1 / +10 / +100). */
function OverlayResources({ profileId, status, onMode }: { profileId: number; status: string; onMode: (m: 'quetes' | 'ressources') => void }) {
  useProgress();
  const { claimOf } = useTeamLive();
  const { team } = teamInfo();
  const profile = profiles.find(p => p.id === profileId)!;
  const [onlyMine, setOnlyMine] = useState(() => { try { return localStorage.getItem('fzth:v2:ovMine') === '1'; } catch { return false; } });
  const teamMode = (() => { try { return localStorage.getItem('fzth:v2:jobTeamMode') !== '0'; } catch { return true; } })();
  const mult = (() => { try { return Number(localStorage.getItem(`fzth:v2:jobMult:${profileId}`)) || 1; } catch { return 1; } })();
  const counted = profiles.filter(p => p.id === profileId || team[p.id]);
  const factor = teamMode ? profiles.length : mult;
  const rows = ALL_JOB_RES.map(x => {
    const k = jobKey(x.name); const need = x.qty * factor;
    const have = teamMode ? counted.reduce((s, p) => s + (qtyOf(p.id, k) ?? 0), 0) : qtyOf(profileId, k) ?? 0;
    return { ...x, k, need, have, missing: Math.max(0, need - have), mine: qtyOf(profileId, k) ?? 0, owner: claimOf(k) };
  }).filter(r => r.missing > 0 && (!onlyMine || r.owner === profileId));
  // Ordre figé à l'ouverture (mes ✋ d'abord, puis le plus gros manque) : les lignes ne sautent pas pendant qu'on clique.
  const [order] = useState(() => [...rows].sort((a, b) => Number(b.owner === profileId) - Number(a.owner === profileId) || b.missing - a.missing).map(r => r.k));
  rows.sort((a, b) => { const ia = order.indexOf(a.k), ib = order.indexOf(b.k); return (ia < 0 ? 1e9 : ia) - (ib < 0 ? 1e9 : ib); });
  const add = (r: (typeof rows)[number], n: number) => setQty(profileId, r.k, Math.max(0, r.mine + n), r.qty * mult);
  return (
    <div className="overlay">
      <header>
        <img className="avatar big" src={new URL(`${import.meta.env.BASE_URL}persos/${profile.image}`, location.href).href} alt="" />
        <ModeTabs mode="ressources" onMode={onMode} />
        <span className={`sync ${status}`} title={status}>●</span>
      </header>
      <NoPipNotice />
      <label className="toggle small"><input type="checkbox" checked={onlyMine} onChange={e => { setOnlyMine(e.target.checked); try { localStorage.setItem('fzth:v2:ovMine', e.target.checked ? '1' : '0'); } catch { /* ignore */ } }} /> Seulement ce que je récolte ✋ · {teamMode ? `équipe ×${factor}` : `moi ×${mult}`}</label>
      <ul className="ov-res">
        {rows.map(r => (
          <li key={r.k} className={r.owner === profileId ? 'mine' : ''}>
            <div className="ov-res-head">
              <ResIcon name={r.name} size={22} />
              <strong>{r.name}</strong>
              <span className="missing">−{r.missing.toLocaleString('fr-FR')}</span>
              {r.owner === undefined && <button className="claim-btn" title="Je m’en occupe" onClick={() => void setClaim(r.k, true)}>✋</button>}
            </div>
            <div className="ov-res-ctrl">
              <input type="number" min={0} value={r.mine || ''} placeholder="j’ai…" onChange={e => setQty(profileId, r.k, Number(e.target.value), r.qty * mult)} />
              <button onClick={() => add(r, 1)}>+1</button><button onClick={() => add(r, 10)}>+10</button><button onClick={() => add(r, 100)}>+100</button>
              <small>{r.have.toLocaleString('fr-FR')} / {r.need.toLocaleString('fr-FR')}</small>
            </div>
          </li>
        ))}
        {!rows.length && <li className="meta">{onlyMine ? 'Rien de pris avec ✋ pour l’instant.' : 'Plus rien ne manque 🎉'}</li>}
      </ul>
    </div>
  );
}

function OverlayQuests({ profileId, isDone, status, onMode }: { profileId: number; isDone: (p: number, id: string) => boolean; status: string; onMode: (m: 'quetes' | 'ressources') => void }) {
  const [dofusId, setDofusId] = useState(() => { try { return localStorage.getItem(LS) ?? catalog[0].id; } catch { return catalog[0].id; } });
  const [count, setCount] = useState(6);
  const pick = (id: string) => { setDofusId(id); try { localStorage.setItem(LS, id); } catch { /* ignore */ } };
  const profile = profiles.find(p => p.id === profileId)!;
  const raw = catalog.find(c => c.id === dofusId) ?? catalog[0];
  const v = viewFor(raw, profileId, isDone);
  const all = v.sections.flatMap(s => s.items.map(i => ({ ...i, section: s.title })));
  const done = v.itemIds.filter(id => isDone(profileId, id)).length;
  const next = all.filter(i => !isDone(profileId, i.id)).slice(0, count);
  const last = [...all].reverse().find(i => isDone(profileId, i.id));

  return (
    <div className="overlay">
      <NoPipNotice />
      <ModeTabs mode="quetes" onMode={onMode} />
      <header>
        <img className="avatar big" src={new URL(`${import.meta.env.BASE_URL}persos/${profile.image}`, location.href).href} alt="" />
        <select value={raw.id} onChange={e => pick(e.target.value)}>{catalog.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <span className={`sync ${status}`} title={status}>●</span>
      </header>
      <div className="ov-progress"><span className="bar"><span style={{ width: `${v.itemIds.length ? (done / v.itemIds.length) * 100 : 0}%` }} /></span><small>{done}/{v.itemIds.length}</small></div>
      <ul>
        {next.map((i, n) => (
          <li key={i.id} className={n === 0 ? 'first' : ''}>
            {i.hint && <div className="hint">ℹ {i.hint}</div>}
            <label>
              <input type="checkbox" checked={false} onChange={() => toggle(profileId, i.id, true)} />
              <span>{i.url ? <a href={i.url} target="_blank" rel="noreferrer">{i.name}</a> : i.name}<small>{i.section}</small></span>
            </label>
            <div className="chips">
              {i.dungeon?.captureOcre && <span className="chip ocre">Ocre</span>}
              {i.dungeon?.name && <span className="chip f-donjon">⛫ {i.dungeon.name}</span>}
              {(i.objectives ?? []).filter(o => !(o.type === 'donjon' && i.dungeon?.name)).map((o, k) => <span key={k} className="chip">{iconInfo(o.type).short}{o.count ? ` ×${o.count}` : ''}{o.label ? ` · ${o.label}` : ''}</span>)}
            </div>
          </li>
        ))}
        {!next.length && <li className="meta">Ce Dofus est terminé 🎉</li>}
      </ul>
      <footer>
        {last && <button onClick={() => toggle(profileId, last.id, false)} title={`Décocher « ${last.name} »`}>↶ Annuler</button>}
        <button onClick={() => setCount(count === 6 ? 15 : 6)}>{count === 6 ? 'Plus' : 'Moins'}</button>
        <a className="link-button" href={HUNT} target="_blank" rel="noreferrer">🧭 Chasse</a>
      </footer>
    </div>
  );
}

type PipApi = { requestWindow: (o: { width: number; height: number }) => Promise<Window> };

export async function openOverlay(profileId: number, dofusId?: string) {
  if (dofusId) try { localStorage.setItem(LS, dofusId); } catch { /* ignore */ }
  const pip = (window as unknown as { documentPictureInPicture?: PipApi }).documentPictureInPicture;
  if (pip) {
    let w: Window;
    try { w = await pip.requestWindow({ width: 360, height: 560 }); }
    catch { window.open(`${location.pathname}#overlay`, 'fzth-overlay', 'width=380,height=620'); return; }
    // Recopie les styles du site dans la mini-fenêtre.
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        const st = w.document.createElement('style');
        st.textContent = Array.from(sheet.cssRules).map(r => r.cssText).join('\n');
        w.document.head.appendChild(st);
      } catch {
        if (sheet.href) { const l = w.document.createElement('link'); l.rel = 'stylesheet'; l.href = sheet.href; w.document.head.appendChild(l); }
      }
    }
    w.document.body.dataset.world = document.body.dataset.world;
    w.document.body.classList.add('pip');
    const el = w.document.createElement('div'); w.document.body.appendChild(el);
    const root = createRoot(el); root.render(<OverlayView profileId={profileId} />);
    w.addEventListener('pagehide', () => root.unmount());
    return;
  }
  // Navigateur sans mini-fenêtre : petite fenêtre séparée (à placer à côté du jeu).
  window.open(`${location.pathname}#overlay`, 'fzth-overlay', 'width=380,height=620');
}
