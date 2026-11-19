// « Signaler une erreur » : fenêtre ouverte depuis n'importe quelle quête, et liste des signalements (onglet Outils).
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Flag } from 'lucide-react';
import { addReport, listReports, resolveReport, type Report } from './model/progress';
import { profiles } from './model/profiles';

let target: { id: string; label: string } | null = null;
const ls = new Set<() => void>();
export const openReport = (id: string, label: string) => { target = { id, label }; ls.forEach(l => l()); };
const close = () => { target = null; ls.forEach(l => l()); };

export function ReportButton({ id, label }: { id: string; label: string }) {
  return <button type="button" className="report-btn" title="Signaler une erreur sur cette quête" onClick={e => { e.preventDefault(); e.stopPropagation(); openReport(id, label); }}><Flag size={13} /></button>;
}

const KINDS = ['Mauvais lien', 'Quête manquante ou en trop', 'Mauvais ordre', 'Mauvais donjon / combat', 'Ressource incorrecte', 'Autre'];

export function ReportDialog({ profileId }: { profileId: number }) {
  const t = useSyncExternalStore(cb => { ls.add(cb); return () => ls.delete(cb); }, () => target);
  const [kind, setKind] = useState(KINDS[0]); const [txt, setTxt] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'ok' | 'err'>('idle');
  useEffect(() => { setTxt(''); setState('idle'); setKind(KINDS[0]); }, [t?.id]);
  if (!t) return null;
  const send = async (e: React.FormEvent) => {
    e.preventDefault(); setState('busy');
    try { await addReport(profileId, t.id, t.label, `${kind}${txt.trim() ? ' — ' + txt.trim() : ''}`); setState('ok'); setTimeout(close, 1200); } catch { setState('err'); }
  };
  return (
    <div className="modal" onClick={close}>
      <form className="panel report-box" onClick={e => e.stopPropagation()} onSubmit={send}>
        <h2><Flag size={18} /> Signaler une erreur</h2>
        <p className="meta">{t.label}</p>
        <div className="report-kinds">{KINDS.map(k => <button type="button" key={k} className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>{k}</button>)}</div>
        <textarea value={txt} onChange={e => setTxt(e.target.value)} rows={3} maxLength={800} placeholder="Précise si tu veux (bon lien, bon donjon, ce qui manque…)" />
        {state === 'ok' && <p className="cu-ok">✓ Merci, c’est noté !</p>}
        {state === 'err' && <p className="warn">Envoi impossible (hors ligne ?). Réessaie plus tard.</p>}
        <div className="row"><button type="button" onClick={close}>Annuler</button><button className="primary" disabled={state === 'busy' || state === 'ok'}>Envoyer</button></div>
      </form>
    </div>
  );
}

export function ReportList({ profileId }: { profileId: number }) {
  const [list, setList] = useState<Report[] | null>(null); const [all, setAll] = useState(false);
  const load = () => listReports(profileId).then(setList).catch(() => setList([]));
  useEffect(() => { void load(); }, [profileId]); // eslint-disable-line react-hooks/exhaustive-deps
  const shown = (list ?? []).filter(r => all || !r.resolved);
  return (
    <div className="toolbox reports">
      <h3><Flag size={16} /> Erreurs signalées</h3>
      <p className="meta small">Signale une erreur avec le petit drapeau à côté d’une quête. Coche quand c’est corrigé.</p>
      {list === null ? <span className="skeleton" /> : shown.length ? (
        <ul>{shown.map(r => (
          <li key={r.id} className={r.resolved ? 'done' : ''}>
            <label><input type="checkbox" checked={r.resolved} onChange={async () => { await resolveReport(profileId, r.id, !r.resolved); void load(); }} />
              <span><strong>{r.label}</strong><br /><small>{r.body}</small><br /><small className="meta">{profiles.find(p => p.id === r.profile_id)?.name} · {new Date(r.created_at).toLocaleDateString('fr-FR')}</small></span></label>
          </li>
        ))}</ul>
      ) : <p className="meta">Aucune erreur en attente 🎉</p>}
      {(list ?? []).some(r => r.resolved) && <label className="toggle small"><input type="checkbox" checked={all} onChange={e => setAll(e.target.checked)} /> Voir aussi les erreurs corrigées</label>}
    </div>
  );
}
