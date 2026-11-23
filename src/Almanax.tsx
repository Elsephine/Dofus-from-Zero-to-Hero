// Page « Almanax » : offrande du jour, bonus, récompenses, quête spéciale, et préparation des jours à venir.
import { ItemImg } from './ui/ItemImg';
import { useEffect, useState } from 'react';
import { addDays, cachedRange, fetchRange, hasSpecialQuest, parisToday, type AlmanaxDay } from './model/almanax';
import { toggle } from './model/progress';

const fmtDate = (d: string, opts: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' }) =>
  new Date(d + 'T12:00:00Z').toLocaleDateString('fr-FR', { ...opts, timeZone: 'UTC' });
const n = (v?: number) => (typeof v === 'number' ? v.toLocaleString('fr-FR') : '—');
const SIZE = 30;

export function Almanax({ profileId, isDone }: { profileId: number; isDone: (p: number, id: string) => boolean }) {
  const today = parisToday();
  const lsLevel = `fzth:v2:almLevel:${profileId}`;
  const [level, setLevelState] = useState<number>(() => { try { return Number(localStorage.getItem(lsLevel)) || 200; } catch { return 200; } });
  const [from, setFrom] = useState(today);
  const [days, setDays] = useState<(AlmanaxDay | undefined)[]>(() => cachedRange(today, SIZE));
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [horizon, setHorizon] = useState(7);
  const [copied, setCopied] = useState('');
  const setLevel = (v: number) => { const x = Math.min(200, Math.max(1, Math.floor(v) || 1)); setLevelState(x); try { localStorage.setItem(lsLevel, String(x)); } catch { /* ignore */ } };

  useEffect(() => {
    let alive = true;
    setDays(cachedRange(from, SIZE)); setState('loading');
    const t = setTimeout(() => {
      fetchRange(from, SIZE, level).then(() => { if (alive) { setDays(cachedRange(from, SIZE)); setState('ok'); } })
        .catch(() => { if (alive) setState('error'); });
    }, 250); // attend la fin de la saisie du niveau
    return () => { alive = false; clearTimeout(t); };
  }, [from, level]);

  const prepKey = (d: string) => `alm-prep:${d}`, doneKey = (d: string) => `alm-done:${d}`;
  const first = days[0];
  // Offrandes à préparer sur les prochains jours (hors jours déjà préparés ou faits).
  const toPrepare = new Map<string, { name: string; qty: number; dates: string[] }>();
  days.slice(0, horizon).forEach((d, i) => {
    const date = addDays(from, i);
    if (!d || isDone(profileId, prepKey(date)) || isDone(profileId, doneKey(date))) return;
    const k = d.tribute.item.name;
    const e = toPrepare.get(k) ?? { name: k, qty: 0, dates: [] };
    e.qty += d.tribute.quantity; e.dates.push(fmtDate(date, { day: 'numeric', month: 'short' })); toPrepare.set(k, e);
  });
  const prepList = [...toPrepare.values()].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  const copy = async () => {
    const txt = prepList.map(p => `${p.qty} × ${p.name} (${p.dates.join(', ')})`).join('\n');
    try { await navigator.clipboard.writeText(txt); setCopied('Copié !'); } catch { setCopied('Copie impossible ici'); }
    setTimeout(() => setCopied(''), 2000);
  };

  return (
    <main className="almanax panel">
      <p className="eyebrow">Calendrier des Mérydes</p>
      <div className="alm-head">
        <h2>✦ Almanax</h2>
        <div className="row">
          <button onClick={() => setFrom(addDays(from, -1))}>← Jour précédent</button>
          <input type="date" value={from} onChange={e => /^\d{4}-\d{2}-\d{2}$/.test(e.target.value) && setFrom(e.target.value)} />
          <button onClick={() => setFrom(addDays(from, 1))}>Jour suivant →</button>
          <button onClick={() => setFrom(today)}>Aujourd’hui</button>
          <label className="mult">Niveau du perso <input type="number" min={1} max={200} value={level} onChange={e => setLevel(Number(e.target.value))} /></label>
        </div>
      </div>
      {state === 'loading' && !first && <p className="meta">Chargement de l’Almanax…</p>}
      {state === 'error' && <p className="warn">Impossible de joindre la source des données{first ? ' : affichage de la dernière version gardée sur cet appareil.' : '.'} <a href="https://www.krosmoz.com/fr/almanax" target="_blank" rel="noreferrer">Almanax officiel ↗</a></p>}

      {first && (
        <section className={`alm-today${hasSpecialQuest(first) ? ' special' : ''}`}>
          <div className="alm-date">{from === today ? 'Aujourd’hui · ' : ''}{fmtDate(first.date)}</div>
          <div className="alm-cards">
            <div className="alm-card">
              <small>📦 Offrande à fournir</small>
              <div className="alm-item"><ItemImg name={first.tribute.item.name} /><strong>{first.tribute.quantity} × {first.tribute.item.name}</strong></div>
            </div>
            <div className="alm-card">
              <small>🪙 Récompense de la quête</small>
              <strong>{n(first.reward_kamas)} kamas</strong>
              <span className="meta">{first.reward_xp !== undefined ? `${n(first.reward_xp)} XP (niveau ${level})` : 'XP non communiquée'}</span>
            </div>
            <div className="alm-card wide">
              <small>✨ Bonus du jour · {first.bonus.type.name}</small>
              <p>{first.bonus.description}</p>
              {hasSpecialQuest(first) && <span className="chip quest">📜 Quête spéciale ce jour-là</span>}
            </div>
          </div>
          <div className="row">
            <label className="toggle"><input type="checkbox" checked={isDone(profileId, prepKey(first.date))} onChange={() => toggle(profileId, prepKey(first.date))} /> Offrande préparée</label>
            <label className="toggle"><input type="checkbox" checked={isDone(profileId, doneKey(first.date))} onChange={() => toggle(profileId, doneKey(first.date))} /> Offrande faite</label>
          </div>
        </section>
      )}

      <div className="alm-split">
        <section className="toolbox">
          <div className="detail-head">
            <h3>À préparer</h3>
            <div className="row">
              {[7, 14, 30].map(h => <button key={h} className={horizon === h ? 'on' : ''} onClick={() => setHorizon(h)}>{h} j</button>)}
              <button className="primary" onClick={copy} disabled={!prepList.length}>{copied || 'Copier'}</button>
            </div>
          </div>
          <p className="meta small">Offrandes des {horizon} prochains jours, sans celles déjà préparées ou faites.</p>
          <ul className="prep-list">
            {prepList.map(p => <li key={p.name}><span className="qty">{p.qty}</span> <span className="rname">{p.name}</span> <small>{p.dates.join(', ')}</small></li>)}
            {!prepList.length && <li className="meta">Rien à préparer 🎉</li>}
          </ul>
        </section>

        <section className="toolbox">
          <h3>Les {SIZE} prochains jours</h3>
          <ul className="alm-list">
            {days.map((d, i) => {
              const date = addDays(from, i);
              const prep = isDone(profileId, prepKey(date)), done = isDone(profileId, doneKey(date));
              return (
                <li key={date} className={`${done ? 'done' : ''}${d && hasSpecialQuest(d) ? ' special' : ''}`}>
                  <span className="d">{fmtDate(date, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                  {d ? (
                    <>
                      <span className="o">{d.tribute.quantity} × {d.tribute.item.name}</span>
                      <span className="b" title={d.bonus.description}>{d.bonus.type.name}{hasSpecialQuest(d) ? ' · 📜 quête' : ''}</span>
                      <span className="k">{n(d.reward_kamas)} K</span>
                    </>
                  ) : <span className="o meta">—</span>}
                  <label title="Offrande préparée"><input type="checkbox" checked={prep} onChange={() => toggle(profileId, prepKey(date))} /> prête</label>
                  <label title="Offrande faite"><input type="checkbox" checked={done} onChange={() => toggle(profileId, doneKey(date))} /> faite</label>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
      <p className="meta small">Données : <a href="https://api.dofusdu.de" target="_blank" rel="noreferrer">API Dofusdude</a> (Dofus Unity). Vérifie en cas de doute sur l’<a href="https://www.krosmoz.com/fr/almanax" target="_blank" rel="noreferrer">Almanax officiel</a>.</p>
    </main>
  );
}
