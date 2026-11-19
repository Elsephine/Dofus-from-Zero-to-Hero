// Horloge de l'équipe : heure en France et chez l'ami au Canada (fuseau réglable), mise à jour chaque minute.
import { useEffect, useState } from 'react';

const ZONES: [string, string][] = [
  ['America/Toronto', 'Montréal · Québec · Toronto'], ['America/Halifax', 'Halifax'], ['America/St_Johns', 'Terre-Neuve'],
  ['America/Winnipeg', 'Winnipeg'], ['America/Regina', 'Saskatchewan'], ['America/Edmonton', 'Calgary · Edmonton'], ['America/Vancouver', 'Vancouver'],
];
const LS = 'fzth:v2:clock';
const fmt = (tz: string, d: Date) => d.toLocaleTimeString('fr-FR', { timeZone: tz, hour: '2-digit', minute: '2-digit' });
const dayDiff = (tz: string, d: Date) => {
  const day = (z: string) => d.toLocaleDateString('sv-SE', { timeZone: z });
  const a = day('Europe/Paris'), b = day(tz);
  return b < a ? ' (veille)' : b > a ? ' (lendemain)' : '';
};

export function Clock() {
  const [cfg, setCfg] = useState<{ tz: string; label: string }>(() => { try { const c = JSON.parse(localStorage.getItem(LS) ?? 'null'); if (c?.tz) return c; } catch { /* ignore */ } return { tz: 'America/Toronto', label: 'Canada' }; });
  const [now, setNow] = useState(new Date());
  const [open, setOpen] = useState(false);
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 20_000); return () => clearInterval(t); }, []);
  const save = (c: typeof cfg) => { setCfg(c); try { localStorage.setItem(LS, JSON.stringify(c)); } catch { /* ignore */ } };
  return (
    <div className="dd clock">
      <button onClick={() => setOpen(!open)} title="Heure chez chacun (cliquer pour régler)">
        <span>🇫🇷 {fmt('Europe/Paris', now)}</span>
        <span title={cfg.label}>🇨🇦 {fmt(cfg.tz, now)}<small>{dayDiff(cfg.tz, now)}</small></span>
      </button>
      {open && (
        <div className="dd-menu panel">
          <h3>Horloge de l’équipe</h3>
          <label>Nom affiché <input value={cfg.label} maxLength={20} onChange={e => save({ ...cfg, label: e.target.value })} /></label>
          <label>Ville au Canada
            <select value={cfg.tz} onChange={e => save({ ...cfg, tz: e.target.value })}>{ZONES.map(([z, l]) => <option key={z} value={z}>{l}</option>)}</select>
          </label>
          <p className="meta small">France : {fmt('Europe/Paris', now)} · {cfg.label || 'Canada'} : {fmt(cfg.tz, now)}{dayDiff(cfg.tz, now)}. Les changements d’heure sont gérés automatiquement.</p>
        </div>
      )}
    </div>
  );
}
