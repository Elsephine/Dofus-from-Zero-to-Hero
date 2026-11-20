// Galerie des stuffs DofusBook : une carte par stuff avec l'aperçu directement visible (capture de la page DofusBook).
import { useState } from 'react';
import { Eye, Plus, Search, Trash2 } from 'lucide-react';
import { profiles } from './model/profiles';
import { useStuffs, type Stuff } from './model/stuffs';

const shot = (url: string, compact: boolean) =>
  `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=false&embed=screenshot.url&waitForTimeout=4000&viewport.width=${compact ? 1100 : 1400}&viewport.height=${compact ? 800 : 1000}`;

export function Stuffs({ profileId }: { profileId: number }) {
  const { list, online, add, remove } = useStuffs(profileId);
  const [q, setQ] = useState(''); const [who, setWho] = useState<number | 'all'>('all');
  const [compact, setCompact] = useState(() => localStorage.getItem('fzth:v2:stuffCompact') === '1');
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState(''); const [url, setUrl] = useState(''); const [err, setErr] = useState('');
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const shown = list.filter(s => (who === 'all' || s.profile_id === who) && norm(s.name).includes(norm(q.trim())));
  const submit = (e: React.FormEvent) => {
    e.preventDefault(); setErr('');
    if (!name.trim()) return setErr('Donne un nom au stuff.');
    if (!/^https:\/\/\S+$/.test(url.trim())) return setErr('Colle un lien qui commence par https://');
    void add(name.trim(), url.trim()); setName(''); setUrl(''); setAdding(false);
  };
  const toggleCompact = () => { const v = !compact; setCompact(v); try { localStorage.setItem('fzth:v2:stuffCompact', v ? '1' : '0'); } catch { /* ignore */ } };
  return (
    <main className="stuffs">
      <div className="stuffs-bar panel">
        <label className="stuffs-search"><Search size={16} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Nom du stuff…" /></label>
        <select value={who} onChange={e => setWho(e.target.value === 'all' ? 'all' : Number(e.target.value))}>
          <option value="all">Tous les personnages</option>
          {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <span className="meta">{shown.length} stuff{shown.length > 1 ? 's' : ''}</span>
        <label className="toggle small"><input type="checkbox" checked={compact} onChange={toggleCompact} /> Compacte</label>
        <button className="primary" onClick={() => setAdding(!adding)}><Plus size={15} /> Ajouter</button>
      </div>
      {adding && (
        <form className="panel stuff-form stuffs-add" onSubmit={submit}>
          <input autoFocus value={name} onChange={e => setName(e.target.value)} maxLength={90} placeholder="Nom du stuff (ex. Féca terre PvM)" />
          <input value={url} onChange={e => setUrl(e.target.value)} type="url" placeholder="https://www.dofusbook.net/…" />
          <button className="primary" type="submit">Enregistrer</button>
          {err && <p className="warn">{err}</p>}
        </form>
      )}
      {online === false && <p className="meta small">Serveur injoignable : les stuffs ajoutés restent sur cet appareil et seront partagés plus tard.</p>}
      <div className={'stuff-grid' + (compact ? ' compact' : '')}>
        {shown.map(s => <StuffCard key={s.id} s={s} compact={compact} onRemove={() => { if (confirm(`Supprimer « ${s.name} » ?`)) void remove(s); }} />)}
        {!shown.length && <p className="meta">{list.length ? 'Aucun stuff ne correspond.' : 'Aucun stuff enregistré : clique sur « Ajouter » et colle un lien DofusBook.'}</p>}
      </div>
    </main>
  );
}

function StuffCard({ s, compact, onRemove }: { s: Stuff; compact: boolean; onRemove: () => void }) {
  const p = profiles.find(x => x.id === s.profile_id);
  const [state, setState] = useState<'load' | 'ok' | 'err'>('load');
  return (
    <article className="stuff-card" data-world={p?.world}>
      <header>
        {p && <img className="avatar" src={`${import.meta.env.BASE_URL}persos/${p.image}`} alt="" />}
        <strong title={s.name}>{s.name}</strong>
        <small>{p?.name}{s.local ? ' · sur cet appareil' : ''}</small>
        <button className="icon-btn" onClick={onRemove} title="Supprimer"><Trash2 size={14} /></button>
      </header>
      <a className="stuff-shot" href={s.url} target="_blank" rel="noreferrer" title="Ouvrir sur DofusBook">
        {state !== 'ok' && <span className="stuff-ph">{state === 'err' ? 'Aperçu indisponible · ouvrir sur DofusBook ↗' : 'Capture du stuff…'}</span>}
        {state !== 'err' && <img src={shot(s.url, compact)} alt={`Aperçu de ${s.name}`} loading="lazy" onLoad={() => setState('ok')} onError={() => setState('err')} style={state === 'ok' ? undefined : { opacity: 0 }} />}
        <span className="stuff-open"><Eye size={14} /> Ouvrir</span>
      </a>
    </article>
  );
}
