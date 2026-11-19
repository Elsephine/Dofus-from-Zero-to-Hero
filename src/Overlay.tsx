// Overlay à côté de Dofus : mini-fenêtre toujours au premier plan (Document Picture-in-Picture, Chrome / Edge),
// sinon petite fenêtre séparée. On y coche la prochaine quête sans quitter le jeu.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { catalog } from './model/catalog';
import { viewFor } from './model/choices';
import { profiles } from './model/profiles';
import { toggle, useProgress } from './model/progress';
import { iconInfo } from './model/icons';

const LS = 'fzth:v2:overlayDofus';
const HUNT = 'https://www.dofuspourlesnoobs.com/resolution-de-chasse-aux-tresors.html';

export function OverlayView({ profileId }: { profileId: number }) {
  const { isDone, status } = useProgress();
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
    const w = await pip.requestWindow({ width: 360, height: 560 });
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
