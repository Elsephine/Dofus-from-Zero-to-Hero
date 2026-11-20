// Galerie des stuffs : chaque carte montre le personnage entouré de ses objets (choisis case par case, partagés),
// à la manière de DofusBook, avec le lien DofusBook en plus.
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ExternalLink, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { profiles } from './model/profiles';
import { useStuffs, type Stuff } from './model/stuffs';
import { useResourceIcon } from './model/resourceIcons';

type Equip = [number, string, number, string, number]; // id, nom, niveau, groupe, iconId
let EQ: Map<number, Equip> | null = null; let EQL: Equip[] = [];
const loadEq = () => import('./data/jeu/equip.json').then(m => { EQL = m.default as Equip[]; EQ = new Map(EQL.map(e => [e[0], e])); });
function useEquip() {
  const [ok, setOk] = useState(!!EQ);
  useEffect(() => { if (!EQ) void loadEq().then(() => setOk(true)); }, []);
  return ok;
}

const GROUP_LABEL: Record<string, string> = { amu: 'Amulette', ann: 'Anneau', bou: 'Bouclier', cha: 'Chapeau', cap: 'Cape', cei: 'Ceinture', bot: 'Bottes', arm: 'Arme', fam: 'Familier / Monture', dof: 'Dofus / Trophée' };
const LEFT = ['amu', 'ann1', 'ann2', 'bou']; const RIGHT = ['cha', 'cap', 'cei', 'bot']; const MID = ['arm', 'fam'];
const BOTTOM = ['dof1', 'dof2', 'dof3', 'dof4', 'dof5', 'dof6'];
const groupOf = (slot: string) => slot.replace(/\d+$/, '');
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function Stuffs({ profileId }: { profileId: number }) {
  const { list, online, add, remove, setItems } = useStuffs(profileId);
  const [q, setQ] = useState(''); const [who, setWho] = useState<number | 'all'>('all');
  const [compact, setCompact] = useState(() => localStorage.getItem('fzth:v2:stuffCompact') === '1');
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState(''); const [url, setUrl] = useState(''); const [err, setErr] = useState('');
  const shown = list.filter(s => (who === 'all' || s.profile_id === who) && norm(s.name).includes(norm(q.trim())));
  useEquip();
  const submit = (e: React.FormEvent) => {
    e.preventDefault(); setErr('');
    if (!name.trim()) return setErr('Donne un nom au stuff.');
    if (url.trim() && !/^https:\/\/\S+$/.test(url.trim())) return setErr('Le lien doit commencer par https:// (ou laisse vide).');
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
          <input autoFocus value={name} onChange={e => setName(e.target.value)} maxLength={90} placeholder="Nom du stuff (ex. Feu / Terre)" />
          <input value={url} onChange={e => setUrl(e.target.value)} type="url" placeholder="Lien DofusBook (facultatif)" />
          <button className="primary" type="submit">Créer le stuff</button>
          <p className="meta small">Ensuite, clique sur ✏️ pour choisir les objets case par case.</p>
          {err && <p className="warn">{err}</p>}
        </form>
      )}
      {online === false && <p className="meta small">Serveur injoignable : les changements restent sur cet appareil et seront partagés plus tard.</p>}
      <div className={'stuff-grid' + (compact ? ' compact' : '')}>
        {shown.map(s => <StuffCard key={s.id} s={s} mine={s.profile_id === profileId} onSave={items => void setItems(s, items)}
          onRemove={() => { if (confirm(`Supprimer « ${s.name} » ?`)) void remove(s); }} />)}
        {!shown.length && <p className="meta">{list.length ? 'Aucun stuff ne correspond.' : 'Aucun stuff : clique sur « Ajouter ».'}</p>}
      </div>
    </main>
  );
}

function StuffCard({ s, onSave, onRemove }: { s: Stuff; mine: boolean; onSave: (items: Record<string, number>) => void; onRemove: () => void }) {
  const p = profiles.find(x => x.id === s.profile_id);
  const [edit, setEdit] = useState(false);
  const [pick, setPick] = useState<string | null>(null);
  const items = s.items ?? {};
  const empty = !Object.keys(items).length;
  const setSlot = (slot: string, id: number | null) => { const n = { ...items }; if (id) n[slot] = id; else delete n[slot]; onSave(n); };
  const cell = (slot: string) => <Slot key={slot} slot={slot} id={items[slot]} edit={edit} onClick={() => edit && setPick(slot)} />;
  return (
    <article className={'stuff-card' + (edit ? ' editing' : '')} data-world={p?.world}>
      <header>
        <strong title={s.name}>{s.name}</strong>
        <small>{p?.name}{s.local ? ' · sur cet appareil' : ''}</small>
        {s.url && <a className="icon-btn" href={s.url} target="_blank" rel="noreferrer" title="Ouvrir sur DofusBook"><ExternalLink size={14} /></a>}
        <button className={'icon-btn' + (edit ? ' on' : '')} onClick={() => setEdit(!edit)} title={edit ? 'Terminer' : 'Choisir les objets'}>{edit ? '✓' : <Pencil size={14} />}</button>
        <button className="icon-btn" onClick={onRemove} title="Supprimer"><Trash2 size={14} /></button>
      </header>
      <div className="stuff-board">
        <div className="col">{LEFT.map(cell)}</div>
        <div className="mid">
          {p && <img className="stuff-hero" src={`${import.meta.env.BASE_URL}persos/${p.image}`} alt={p.name} />}
          {empty && !edit && <button className="stuff-empty" onClick={() => setEdit(true)}>✏️ Choisir les objets</button>}
          <div className="row">{MID.map(cell)}</div>
        </div>
        <div className="col">{RIGHT.map(cell)}</div>
        <div className="bottom">{BOTTOM.map(cell)}</div>
      </div>
      {pick && <Picker slot={pick} current={items[pick]} onPick={id => { setSlot(pick, id); setPick(null); }} onClose={() => setPick(null)} />}
    </article>
  );
}

function Slot({ slot, id, edit, onClick }: { slot: string; id?: number; edit: boolean; onClick: () => void }) {
  const e = id && EQ ? EQ.get(id) : undefined;
  return (
    <button className={'stuff-slot' + (e ? ' full' : '')} onClick={onClick} disabled={!edit}
      title={e ? `${e[1]} · niv. ${e[2]}` : GROUP_LABEL[groupOf(slot)]}>
      {e ? <ItemIcon name={e[1]} /> : edit ? <Plus size={14} /> : null}
    </button>
  );
}

function ItemIcon({ name }: { name: string }) {
  const src = useResourceIcon(name);
  return src ? <img src={src} alt={name} loading="lazy" /> : <span className="stuff-ini">{name.slice(0, 2)}</span>;
}

function Picker({ slot, current, onPick, onClose }: { slot: string; current?: number; onPick: (id: number | null) => void; onClose: () => void }) {
  const g = groupOf(slot); const [q, setQ] = useState(''); const [max, setMax] = useState(200);
  const ok = useEquip();
  const res = useMemo(() => {
    const n = norm(q.trim());
    return EQL.filter(e => e[3] === g && e[2] <= max && (!n || norm(e[1]).includes(n))).slice(0, 60);
  }, [q, g, max, ok]); // eslint-disable-line react-hooks/exhaustive-deps
  return createPortal(
    <div className="modal" onClick={onClose}>
      <div className="panel stuff-picker" onClick={e => e.stopPropagation()}>
        <header><strong>{GROUP_LABEL[g]}</strong><button className="icon-btn" onClick={onClose}><X size={16} /></button></header>
        <div className="row">
          <label className="stuffs-search"><Search size={15} /><input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Nom de l’objet…" /></label>
          <label className="meta small">Niv. max <input type="number" min={1} max={200} value={max} onChange={e => setMax(Math.max(1, Math.min(200, Number(e.target.value) || 200)))} /></label>
        </div>
        {current && <button className="link-like" onClick={() => onPick(null)}>Retirer l’objet de cette case</button>}
        <ul>
          {!ok && <li className="meta">Chargement des objets…</li>}
          {res.map(e => (
            <li key={e[0]}><button className={e[0] === current ? 'on' : ''} onClick={() => onPick(e[0])}>
              <span className="pick-ic"><ItemIcon name={e[1]} /></span><span>{e[1]}</span><small>niv. {e[2]}</small>
            </button></li>
          ))}
          {ok && !res.length && <li className="meta">Aucun objet trouvé.</li>}
        </ul>
      </div>
    </div>, document.body);
}
