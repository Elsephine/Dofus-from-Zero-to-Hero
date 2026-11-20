// Page « Équipe » : progression des 3 personnages côte à côte (pour ceux qui la partagent) et quêtes à faire ensemble.
import { useMemo, useState } from 'react';
import { catalog, type ItemView } from './model/catalog';
import { viewFor } from './model/choices';
import { profiles } from './model/profiles';
import { setShare, teamInfo } from './model/progress';
import { iconInfo } from './model/icons';
import { Goals } from './Goals';
import { Availability, Harvest, MemberStatus } from './TeamLive';
import { CatchUp } from './CatchUp';
import { Messages } from './Messages';
import { Ranking } from './Achievements';
import { useAchData } from './model/achievements';
import { useMessages } from './model/messages';

const GROUP = new Set(['combat-groupe', 'combat-vague-groupe', 'donjon', 'aide-personnes']);
const isGroup = (i: ItemView) => !!i.dungeon?.name || (i.objectives ?? []).some(o => GROUP.has(o.type));

// Même logique que le groupe en jeu : d'abord se caler les uns sur les autres, puis se parler, s'organiser.
export const TEAM_TABS: [string, string][] = [['ensemble', '🤝 Jouer ensemble'], ['messages', '💬 Messages'], ['goals', '🎯 Objectifs'], ['avail', '🗓 Disponibilités'], ['harvest', '🌾 Récolte'], ['rank', '🏅 Classement'], ['progress', '📊 Progression par Dofus']];

export function Team({ profileId, isDone, tab, onTab, onOpenDofus }: { profileId: number; isDone: (p: number, id: string) => boolean; tab: string; onTab: (t: string) => void; onOpenDofus: (id: string) => void }) {
  const { unread } = useMessages();
  const achD = useAchData();
  const { team, teamLoaded } = teamInfo();
  const [dofusId, setDofusId] = useState(() => { try { return localStorage.getItem('fzth:v2:teamDofus') ?? 'dom-de-pin'; } catch { return 'dom-de-pin'; } });
  const [onlyGroup, setOnlyGroup] = useState(true);
  const [err, setErr] = useState('');
  const pick = (id: string) => { setDofusId(id); try { localStorage.setItem('fzth:v2:teamDofus', id); } catch { /* ignore */ } };
  // Membres visibles : moi + ceux qui partagent.
  const members = profiles.filter(p => p.id === profileId || team[p.id]);
  const raw = catalog.find(c => c.id === dofusId) ?? catalog[0];

  // Chaque personnage a ses propres choix (alignement…) : on résout la liste pour chacun, puis on fusionne dans l'ordre.
  const rows = useMemo(() => {
    const order: ItemView[] = []; const seen = new Set<string>();
    const perMember = new Map<number, Set<string>>();
    for (const m of members) {
      const v = viewFor(raw, m.id, isDone);
      perMember.set(m.id, new Set(v.itemIds));
      for (const s of v.sections) for (const i of s.items) if (!seen.has(i.id)) { seen.add(i.id); order.push(i); }
    }
    return order.map(i => ({ item: i, status: members.map(m => ({ m, concerned: perMember.get(m.id)!.has(i.id), done: isDone(m.id, i.id) })) }));
  }, [raw, members, isDone]); // eslint-disable-line react-hooks/exhaustive-deps

  const together = rows.filter(r => isGroup(r.item) && r.status.filter(s => s.concerned && !s.done).length >= 2);
  const shown = onlyGroup ? together : rows.filter(r => r.status.some(s => s.concerned && !s.done));
  const pct = (pid: number) => { const v = viewFor(raw, pid, isDone); return v.itemIds.length ? Math.round(v.itemIds.filter(id => isDone(pid, id)).length / v.itemIds.length * 100) : 0; };
  const toggleShare = async () => { setErr(''); try { await setShare(profileId, !team[profileId]); } catch { setErr('Impossible de changer le partage : serveur injoignable.'); } };

  return (
    <main className="team-page panel">
      <p className="eyebrow">L’aventure à trois</p>
      <div className="alm-head">
        <h2>Équipe</h2>
        <label className="toggle share"><input type="checkbox" checked={!!team[profileId]} onChange={toggleShare} disabled={!teamLoaded} /> Partager ma progression avec l’équipe (lecture seule)</label>
      </div>
      {err && <p className="warn">{err}</p>}
      <MemberStatus profileId={profileId} />
      <nav className="tabs always team-tabs">
        {TEAM_TABS.map(([id, label]) => <button key={id} className={tab === id ? 'on' : ''} onClick={() => onTab(id)}>{label}{id === 'messages' && unread > 0 && <span className="badge inline">{unread}</span>}</button>)}
      </nav>
      {tab === 'ensemble' && <CatchUp profileId={profileId} isDone={isDone} onOpenDofus={name => { const c = catalog.find(x => x.name === name); if (c) onOpenDofus(c.id); }} />}
      {tab === 'messages' && <Messages profileId={profileId} />}
      {tab === 'rank' && (achD ? <Ranking d={achD} profileId={profileId} isDone={isDone} /> : <span className="skeleton" />)}
      {tab === 'goals' && <Goals profileId={profileId} isDone={isDone} />}
      {tab === 'avail' && <Availability profileId={profileId} />}
      {tab === 'harvest' && <Harvest profileId={profileId} />}
      {tab === 'progress' && <>
      <h2 className="sub">Progression par Dofus</h2>
      {!teamLoaded && <p className="meta">Le partage passe par le serveur : il s’active une fois le site en ligne et synchronisé.</p>}
      <div className="members">
        {members.map(p => <span key={p.id} className="chip">{p.name} : {pct(p.id)} % · {raw.name}</span>)}
      </div>

      <div className="row team-tools">
        <select value={raw.id} onChange={e => pick(e.target.value)}>{catalog.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <label className="toggle"><input type="checkbox" checked={onlyGroup} onChange={e => setOnlyGroup(e.target.checked)} /> Seulement les quêtes à faire ensemble</label>
        <span className="meta">{together.length} quête{together.length > 1 ? 's' : ''} de groupe / donjon qu’au moins deux d’entre vous n’ont pas faites</span>
      </div>

      <table className="team-table">
        <thead><tr><th>Quête</th><th>À prévoir</th>{members.map(m => <th key={m.id}>{m.name}</th>)}</tr></thead>
        <tbody>
          {shown.map(({ item, status }) => (
            <tr key={item.id}>
              <td>{item.url ? <a href={item.url} target="_blank" rel="noreferrer">{item.name}</a> : item.name}</td>
              <td className="chips-cell">
                {item.dungeon?.name && <span className="chip f-donjon">⛫ {item.dungeon.name}</span>}
                {(item.objectives ?? []).filter(o => !(o.type === 'donjon' && item.dungeon?.name)).map((o, k) => <span key={k} className="chip">{iconInfo(o.type).short}{o.count ? ` ×${o.count}` : ''}{o.label && o.type === 'donjon' ? ` · ${o.label}` : ''}</span>)}
              </td>
              {status.map(s => <td key={s.m.id} className={`st ${!s.concerned ? 'na' : s.done ? 'ok' : 'todo'}`}>{!s.concerned ? '—' : s.done ? '✓' : '·'}</td>)}
            </tr>
          ))}
          {!shown.length && <tr><td colSpan={2 + members.length} className="meta">Rien à faire ensemble sur ce Dofus pour l’instant.</td></tr>}
        </tbody>
      </table>
      </>}
      {members.length < 2 && <p className="meta small">Personne d’autre ne partage encore sa progression : chacun peut cocher la case en haut.</p>}
    </main>
  );
}
