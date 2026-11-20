// Overlay à côté de Dofus : mini-fenêtre toujours au premier plan (Document Picture-in-Picture, Chrome / Edge),
// sinon petite fenêtre séparée. On y coche la prochaine quête sans quitter le jeu.
import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { catalog } from './model/catalog';
import { dofusInfo } from './data/tougli/dofus-info';
import { viewFor } from './model/choices';
import { profiles } from './model/profiles';
import { sync, toggle, useProgress } from './model/progress';
import { overlayClosed, overlayOpened } from './model/overlayState';
import { achKey, useAchData } from './model/achievements';
import { repeatables } from './data/jeu/quetes';
import { favKey, repKey, repTodo } from './model/repeat';
import { cachedRange, parisToday } from './model/almanax';
import { GROUP_KEY, groupQuests, readGroupBy, type GroupBy } from './model/questGroups';
import { iconInfo } from './model/icons';
import { ALL_JOB_RES, jobKey } from './model/jobs';
import { qtyOf, setQty, teamInfo } from './model/progress';
import { useTeamLive, setClaim } from './model/teamlive';
import { ResIcon } from './Mates';

const LS = 'fzth:v2:overlayDofus';
type Mode = 'jour' | 'quetes' | 'ressources';
const HUNT = 'https://www.dofuspourlesnoobs.com/resolution-de-chasse-aux-tresors.html';

export function OverlayView({ profileId }: { profileId: number }) {
  const { isDone, status } = useProgress();
  useEffect(() => { if (location.hash !== '#overlay') return; const t = setInterval(() => void sync(), 5000); return () => clearInterval(t); }, []);
  const [mode, setModeState] = useState<Mode>(() => { try { return (localStorage.getItem('fzth:v2:overlayMode') as Mode) ?? 'quetes'; } catch { return 'quetes'; } });
  const setMode = (m: Mode) => { setModeState(m); try { localStorage.setItem('fzth:v2:overlayMode', m); } catch { /* ignore */ } };
  if (mode === 'jour') return <OverlayDay profileId={profileId} isDone={isDone} status={status} onMode={setMode} />;
  if (mode === 'ressources') return <OverlayResources profileId={profileId} status={status} onMode={setMode} />;
  return <OverlayQuests profileId={profileId} isDone={isDone} status={status} onMode={setMode} />;
}

const isPip = () => typeof window !== 'undefined' && location.hash !== '#overlay';
function NoPipNotice() {
  if (isPip()) return null;
  return <p className="ov-warn">⚠ Ce navigateur ne peut pas garder cette fenêtre au premier plan. Ouvre le site dans <strong>Chrome ou Edge sur ordinateur</strong> pour avoir l’overlay toujours visible au-dessus de Dofus.</p>;
}

function ModeTabs({ mode, onMode }: { mode: Mode; onMode: (m: Mode) => void }) {
  return (
    <div className="ov-tabs">
      <button className={mode === 'jour' ? 'on' : ''} onClick={() => onMode('jour')}>☀ Aujourd’hui</button>
      <button className={mode === 'quetes' ? 'on' : ''} onClick={() => onMode('quetes')}>📜 Quêtes</button>
      <button className={mode === 'ressources' ? 'on' : ''} onClick={() => onMode('ressources')}>🌾 Ressources</button>
    </div>
  );
}

/** Overlay « Aujourd'hui » : ce qu'on coche pendant la session, comme la page d'accueil du site. */
function OverlayDay({ profileId, isDone, status, onMode }: { profileId: number; isDone: (p: number, id: string) => boolean; status: string; onMode: (m: Mode) => void }) {
  const profile = profiles.find(p => p.id === profileId)!;
  const abs = (path: string) => new URL(`${import.meta.env.BASE_URL}${path}`, location.href).href;
  const favs = repeatables.filter(q => isDone(profileId, favKey(q)));
  const left = repTodo(repeatables, profileId, isDone);
  const alm = cachedRange(parisToday(), 1)[0];
  const offered = alm ? isDone(profileId, `alm-done:${alm.date}`) : false;
  const doing = catalog.map(raw => { const v = viewFor(raw, profileId, isDone); const d = v.itemIds.filter(id => isDone(profileId, id)).length; return { raw, d, pct: v.itemIds.length ? Math.round((d / v.itemIds.length) * 100) : 0 }; })
    .filter(x => x.d > 0 && x.pct < 100).sort((a, b) => b.pct - a.pct).slice(0, 4);
  const resume = (id: string) => { try { localStorage.setItem(LS, id); } catch { /* ignore */ } onMode('quetes'); };
  return (
    <div className="overlay ov-quests ov-day" data-world={profile.world}>
      <NoPipNotice />
      <ModeTabs mode="jour" onMode={onMode} />
      <header className="ov-day-head"><img src={abs('persos/' + profile.image)} alt="" /><strong>{profile.name}</strong><i className={`sync-dot ${status}`} /></header>
      <section className="ov-block">
        <h4>🔁 Répétables {left.length > 0 ? <span className="badge inline">{left.length}</span> : favs.length ? '✓' : ''}</h4>
        {favs.length ? <ul className="ov-checks">{favs.map(q => {
          const d = isDone(profileId, repKey(q));
          return <li key={q.id} className={d ? 'done' : ''}><label><input type="checkbox" checked={d} onChange={() => toggle(profileId, repKey(q))} /> {q.n}<small>{q.f === 'j' ? 'jour' : 'semaine'}</small></label></li>;
        })}</ul> : <p className="meta small">Aucune répétable favorite : mets des ⭐ dans Quêtes → Répétables sur le site.</p>}
      </section>
      <section className="ov-block">
        <h4>📅 Almanax</h4>
        {alm ? <label className={`ov-alm${offered ? ' done' : ''}`}><input type="checkbox" checked={offered} onChange={() => toggle(profileId, `alm-done:${alm.date}`)} />
          {alm.tribute.item.image_urls?.icon && <img src={alm.tribute.item.image_urls.icon} alt="" />}<span>{alm.tribute.quantity} × {alm.tribute.item.name}<small>{alm.bonus.type.name}</small></span></label>
          : <p className="meta small">Ouvre l’accueil du site une fois pour charger l’Almanax du jour.</p>}
      </section>
      <section className="ov-block">
        <h4>🥚 Reprendre</h4>
        {doing.length ? <div className="ov-resume">{doing.map(x => { const di = dofusInfo.find(d => d.id === x.raw.id); return (
          <button key={x.raw.id} onClick={() => resume(x.raw.id)} title={`${x.raw.name} · ${x.pct} %`}>{di?.image && <img src={abs('dofus/' + di.image)} alt="" />}<span>{x.raw.name}<small>{x.pct} %</small></span></button>
        ); })}</div> : <p className="meta small">Aucun Dofus commencé.</p>}
      </section>
    </div>
  );
}

/** Overlay « ressources de métiers » : ce qui manque, saisie rapide de ce qu'on a récolté (+1 / +10 / +100). */
function OverlayResources({ profileId, status, onMode }: { profileId: number; status: string; onMode: (m: Mode) => void }) {
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
    <div className="overlay ov-quests" data-world={profile.world}>
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
              <span className="ov-res-icon"><ResIcon name={r.name} size={34} /></span>
              <strong>{r.name}</strong>
              <span className="missing">−{r.missing.toLocaleString('fr-FR')}</span>
              {r.owner === undefined && <button className="claim-btn" title="Je m’en occupe" onClick={() => void setClaim(r.k, true)}>✋</button>}
            </div>
            <div className="ov-res-ctrl">
              <input type="number" min={0} value={r.mine || ''} placeholder="j’ai…" onChange={e => setQty(profileId, r.k, Number(e.target.value), r.qty * mult)} />
              <button onClick={() => add(r, 1)}>+1</button><button onClick={() => add(r, 10)}>+10</button><button onClick={() => add(r, 100)}>+100</button>
              <small>{r.have.toLocaleString('fr-FR')} / {r.need.toLocaleString('fr-FR')}</small>
            </div>
            <div className="ov-res-bar"><i style={{ width: `${Math.min(100, (r.have / Math.max(1, r.need)) * 100)}%` }} /></div>
          </li>
        ))}
        {!rows.length && <li className="meta">{onlyMine ? 'Rien de pris avec ✋ pour l’instant.' : 'Plus rien ne manque 🎉'}</li>}
      </ul>
    </div>
  );
}

function OverlayQuests({ profileId, isDone, status, onMode }: { profileId: number; isDone: (p: number, id: string) => boolean; status: string; onMode: (m: Mode) => void }) {
  const [dofusId, setDofusId] = useState(() => { try { return localStorage.getItem(LS) ?? catalog[0].id; } catch { return catalog[0].id; } });
  const [count, setCount] = useState(6);
  // Mode focus partagé avec le site : seulement la quête en cours et les 2 suivantes.
  const [focus, setFocusState] = useState(() => { try { return localStorage.getItem('fzth:v2:focus') === 'true'; } catch { return false; } });
  const setFocus = (v: boolean) => { setFocusState(v); try { localStorage.setItem('fzth:v2:focus', String(v)); } catch { /* ignore */ } };
  const pick = (id: string) => { setDofusId(id); try { localStorage.setItem(LS, id); } catch { /* ignore */ } };
  const profile = profiles.find(p => p.id === profileId)!;
  const raw = catalog.find(c => c.id === dofusId) ?? catalog[0];
  const v = viewFor(raw, profileId, isDone);
  // Même rangement que la page du Dofus : par succès (par défaut) ou par étape.
  const achD = useAchData();
  const [groupBy, setGroupByState] = useState<GroupBy>(readGroupBy);
  const setGroupBy = (g: GroupBy) => { setGroupByState(g); try { localStorage.setItem(GROUP_KEY, JSON.stringify(g)); } catch { /* ignore */ } };
  const groups = groupQuests(v.sections, groupBy, achD);
  const all = groups.flatMap(g => g.items.map(i => ({ ...i, section: g.title, gid: g.id })));
  const groupOf = new Map(groups.map(g => [g.id, g]));
  const done = v.itemIds.filter(id => isDone(profileId, id)).length;
  // Coéquipiers qui partagent leur progression : on montre ce qu'ils ont déjà fait.
  const { team } = teamInfo();
  const mates = profiles.filter(p => p.id !== profileId && team[p.id]);
  const [behindOnly, setBehindOnly] = useState(false);
  const seen = new Set<string>();
  const next = all.filter(i => { if (seen.has(i.id)) return false; seen.add(i.id); return !isDone(profileId, i.id) && (!behindOnly || mates.some(m => isDone(m.id, i.id))); }).slice(0, focus ? 3 : count);
  const behindCount = [...new Set(all.filter(i => !isDone(profileId, i.id) && mates.some(m => isDone(m.id, i.id))).map(i => i.id))].length;
  const last = [...all].reverse().find(i => isDone(profileId, i.id));

  const pct = v.itemIds.length ? Math.round((done / v.itemIds.length) * 100) : 0;
  const info = dofusInfo.find(d => d.id === raw.id);
  const abs = (path: string) => new URL(`${import.meta.env.BASE_URL}${path}`, location.href).href;
  // Bandeau d'œufs : Dofus commencés (ou celui affiché) en premier, pour changer d'un clic.
  const eggs = dofusInfo.filter(d => catalog.some(c => c.id === d.id)).map(d => {
    const c = viewFor(catalog.find(x => x.id === d.id)!, profileId, isDone);
    const n = c.itemIds.filter(id => isDone(profileId, id)).length;
    return { d, n, total: c.itemIds.length };
  }).sort((a, b) => Number(b.d.id === raw.id) - Number(a.d.id === raw.id) || Number(b.n > 0 && b.n < b.total) - Number(a.n > 0 && a.n < a.total));
  // Ce que les coéquipiers viennent de cocher sur ce Dofus (affiché quelques secondes).
  const prevMates = useRef<{ dofus: string; set: Set<string> } | null>(null);
  const [flash, setFlash] = useState<string[]>([]);
  const mateDone = mates.flatMap(m => v.itemIds.filter(id => isDone(m.id, id)).map(id => `${m.id}|${id}`));
  const sig = mateDone.join(',');
  useEffect(() => {
    const now = new Set(mateDone); const before = prevMates.current;
    prevMates.current = { dofus: raw.id, set: now };
    // Au premier affichage, en changeant de Dofus ou après un gros rattrapage, on ne fait pas défiler tout l'historique.
    if (before && before.dofus === raw.id && now.size - before.set.size <= 20) {
      const fresh = [...now].filter(k => !before.set.has(k)).slice(0, 3).map(k => {
        const [pid, id] = [Number(k.split('|')[0]), k.slice(k.indexOf('|') + 1)];
        return `${profiles.find(p => p.id === pid)?.name} a fait « ${all.find(i => i.id === id)?.name ?? id} »`;
      });
      if (fresh.length) { setFlash(fresh); const t = setTimeout(() => setFlash([]), 8000); return () => clearTimeout(t); }
    }
  }, [sig, raw.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const [first, ...rest] = next;
  const GroupHead = ({ gid, big }: { gid: string; big?: boolean }) => {
    const g = groupOf.get(gid)!; const n = g.items.filter(i => isDone(profileId, i.id)).length;
    return (
      <span className={`ov-group${big ? ' big' : ''}${g.ach ? ' ach' : ''}`}>
        {g.ach ? '🏆 ' : ''}{g.title} <small>{n}/{g.items.length}{g.ach ? ` · ${g.ach.pts} pts` : ''}</small>
      </span>
    );
  };
  // Succès dont toutes les quêtes de ce Dofus sont faites mais pas encore cochés : petit rappel.
  const toValidate = groups.filter(g => g.ach && g.ach.total <= g.items.length && g.items.every(i => isDone(profileId, i.id)) && !isDone(profileId, achKey(g.ach.id))).slice(0, 2);
  const matesOf = (id: string) => mates.length > 0 && (
    <span className="ov-mates">{mates.map(m => { const ok = isDone(m.id, id); return <img key={m.id} src={abs('persos/' + m.image)} alt={m.name} className={ok ? 'ok' : 'no'} title={`${m.name} : ${ok ? 'déjà faite ✓' : 'pas encore'}`} />; })}</span>
  );
  const chipsOf = (i: (typeof next)[number]) => (
    <div className="ov-chips">
      {i.dungeon?.captureOcre && <span className="ov-chip ocre" title="Donjon à capturer pour le Dofus Ocre">◆ Ocre</span>}
      {i.dungeon?.tourDuMonde && <span className="ov-chip tdm" title="Demandé dans le Tour du monde">🌍</span>}
      {i.dungeon?.name && <span className="ov-chip dj">⛫ {i.dungeon.name}</span>}
      {(i.objectives ?? []).filter(o => !(o.type === 'donjon' && i.dungeon?.name)).map((o, k) => {
        const ic = iconInfo(o.type);
        return <span key={k} className={`ov-chip f-${ic.family}`} title={ic.label}>{ic.short.split(' ')[0]}{o.count ? `×${o.count}` : ''}{o.label && o.type === 'donjon' ? ` ${o.label}` : ''}</span>;
      })}
    </div>
  );

  return (
    <div className="overlay ov-quests" data-world={profile.world}>
      <NoPipNotice />
      <ModeTabs mode="quetes" onMode={onMode} />
      <section className="ov-hero" style={info?.image ? { backgroundImage: `radial-gradient(circle at 85% 40%, transparent 0, var(--bg) 70%), url(${abs('dofus/' + info.image)})` } : undefined}>
        <div className="ov-ring" style={{ background: `conic-gradient(var(--world-accent) ${pct * 3.6}deg, #ffffff15 0)` }}>
          {info?.image && <img src={abs('dofus/' + info.image)} alt="" />}
        </div>
        <div className="ov-hero-text">
          <strong>{raw.name}</strong>
          <small>{done}/{v.itemIds.length} · {pct} %</small>
          <span className="ov-me"><img src={abs('persos/' + profile.image)} alt="" />{profile.name}<i className={`sync-dot ${status}`} /></span>
          {mates.map(m => { const n = v.itemIds.filter(id => isDone(m.id, id)).length; const d = n - done; return (
            <span key={m.id} className="ov-mate-prog" data-world={m.world} title={`${m.name} : ${n}/${v.itemIds.length} sur ce Dofus`}>
              <img src={abs('persos/' + m.image)} alt="" />{m.name} <b>{Math.round((n / Math.max(1, v.itemIds.length)) * 100)} %</b>
              {d !== 0 && <em className={d > 0 ? 'ahead' : 'behind'}>{d > 0 ? `+${d}` : d}</em>}
            </span>); })}
        </div>
      </section>
      {!focus && <nav className="ov-eggs">
        {eggs.map(({ d, n, total }) => (
          <button key={d.id} className={`ov-egg${d.id === raw.id ? ' on' : ''}${n === total ? ' complete' : ''}`} onClick={() => pick(d.id)} title={`${d.name} · ${n}/${total}`}>
            {d.image && <img src={abs('dofus/' + d.image)} alt="" />}
            {n > 0 && n < total && <i style={{ width: `${(n / total) * 100}%` }} />}
          </button>
        ))}
      </nav>}
      {!focus && <div className="ov-groupby">
        <button className={groupBy === 'succes' ? 'on' : ''} onClick={() => setGroupBy('succes')}>🏆 Par succès</button>
        <button className={groupBy === 'etapes' ? 'on' : ''} onClick={() => setGroupBy('etapes')}>📋 Par étape</button>
      </div>}
      {toValidate.map(g => (
        <div key={g.id} className="ov-validate">🏆 « {g.title} » est complet ! <button onClick={() => toggle(profileId, achKey(g.ach!.id), true)}>Cocher le succès</button></div>
      ))}
      {flash.length > 0 && <div className="ov-flash">{flash.map(f => <span key={f}>✓ {f}</span>)}</div>}
      {mates.length > 0 && (behindCount > 0 || behindOnly) && (
        <button className={`ov-behind${behindOnly ? ' on' : ''}`} onClick={() => setBehindOnly(!behindOnly)}>
          {behindOnly ? '← Toutes les quêtes' : `👥 ${behindCount} quête${behindCount > 1 ? 's' : ''} déjà faite${behindCount > 1 ? 's' : ''} par l’équipe : les voir`}
        </button>
      )}
      {first ? (
        <article className="ov-next">
          <span className="ov-label">Prochaine quête</span>
          <GroupHead gid={first.gid} big />
          {first.hint && <p className="ov-hint">ℹ {first.hint}</p>}
          <div className="ov-next-main">
            <button className="ov-check big" onClick={() => toggle(profileId, first.id, true)} title="Valider cette quête">✓</button>
            <span className="ov-name">{first.url ? <a href={first.url} target="_blank" rel="noreferrer">{first.name}</a> : first.name}</span>
            {matesOf(first.id)}
          </div>
          {chipsOf(first)}
        </article>
      ) : <p className="ov-done">{behindOnly ? '✓ Plus aucun retard sur l’équipe ici !' : '🎉 Ce Dofus est terminé !'}</p>}
      <ul className="ov-list">
        {rest.map((i, n) => (
          <li key={i.id} className={(n === 0 ? first : rest[n - 1])?.gid !== i.gid ? 'new-group' : ''}>
            {(n === 0 ? first : rest[n - 1])?.gid !== i.gid && <GroupHead gid={i.gid} />}
            <button className="ov-check" onClick={() => toggle(profileId, i.id, true)} title="Valider">✓</button>
            <span className="ov-name">{i.url ? <a href={i.url} target="_blank" rel="noreferrer">{i.name}</a> : i.name}{matesOf(i.id)}</span>
            {chipsOf(i)}
          </li>
        ))}
      </ul>
      <footer>
        {last && <button onClick={() => toggle(profileId, last.id, false)} title={`Décocher « ${last.name} »`}>↶ Annuler</button>}
        <button className={focus ? 'on' : ''} onClick={() => setFocus(!focus)} title="Seulement la quête en cours et les 2 suivantes">🎯 {focus ? 'Tout voir' : 'Focus'}</button>
        {!focus && <button onClick={() => setCount(count === 6 ? 15 : 6)}>{count === 6 ? '＋ Plus' : '－ Moins'}</button>}
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
    w.document.body.dataset.theme = document.body.dataset.theme;
    w.document.body.classList.add('pip');
    const el = w.document.createElement('div'); w.document.body.appendChild(el);
    const root = createRoot(el); root.render(<OverlayView profileId={profileId} />);
    // Synchro rapide pilotée par la mini-fenêtre elle-même : elle reste visible pendant qu'on joue,
    // alors que la page du site (cachée derrière le jeu) est ralentie par le navigateur.
    const t = w.setInterval(() => void sync(), 5000);
    overlayOpened();
    w.addEventListener('pagehide', () => { w.clearInterval(t); root.unmount(); overlayClosed(); });
    return;
  }
  // Navigateur sans mini-fenêtre : petite fenêtre séparée (à placer à côté du jeu).
  window.open(`${location.pathname}#overlay`, 'fzth-overlay', 'width=380,height=620');
}
