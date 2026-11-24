// Équipe en direct : qui est en ligne, disponibilités de la semaine, répartition de la récolte, succès de donjon à plusieurs.
import { dungeonKeys } from './data/jeu/clefs';
import { dungeonBosses } from './data/jeu/boss';
import { BossImg } from './ui/BossImg';
import { challengeOf, planRuns } from './model/achievements';
import { useMemo, useRef, useState } from 'react';
import { profiles, teamProfiles } from './model/profiles';
import { isDone, qtyOf, teamInfo, toggle } from './model/progress';
import { loadAvail, setClaim, setMyAvail, useTeamLive } from './model/teamlive';
import { allJobRes, jobKey, useJobLevels } from './model/jobs';
import { ResIcon } from './Mates';
import { dungeons, GAME_VERSION } from './data/jeu/donjons';
import { useGoals } from './model/goals';
import { getItem } from './model/search';

type IsDone = (p: number, id: string) => boolean;
const avatar = (img: string) => `${import.meta.env.BASE_URL}persos/${img}`;
const timeAgo = (iso: string | null) => {
  if (!iso) return 'jamais vu';
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  return m < 2 ? 'à l’instant' : m < 60 ? `il y a ${m} min` : m < 1440 ? `il y a ${Math.round(m / 60)} h` : `il y a ${Math.round(m / 1440)} j`;
};

/** En-tête : coéquipiers qui ont le site ouvert en ce moment. */
export function OnlineNow({ profileId }: { profileId: number }) {
  const { isOnline, pageOf } = useTeamLive();
  const on = profiles.filter(p => p.id !== profileId && isOnline(p.id));
  if (!on.length) return null;
  return (
    <div className="online-now" title={on.map(p => `${p.name} est en ligne${pageOf(p.id) ? ` · ${pageOf(p.id)}` : ''}`).join('\n')}>
      {on.map(p => <span key={p.id} className="on-av"><img src={avatar(p.image)} alt={p.name} /><i /></span>)}
    </div>
  );
}

/** Cartes des membres avec leur statut (en ligne / vu il y a…). */
export function MemberStatus({ profileId }: { profileId: number }) {
  const { isOnline, pageOf, lastSeen } = useTeamLive();
  const { team } = teamInfo();
  return (
    <div className="members">
      {profiles.map(p => (
        <div key={p.id} className={`member${isOnline(p.id) ? ' online' : ''}`} data-world={p.world}>
          <span className="on-av"><img className="avatar big" src={avatar(p.image)} alt="" />{isOnline(p.id) && <i />}</span>
          <span><strong>{p.name}</strong>
            <small>{isOnline(p.id) ? `En ligne${pageOf(p.id) ? ` · ${pageOf(p.id)}` : ''}` : p.id === profileId ? 'Toi' : timeAgo(lastSeen(p.id))}
              {p.id !== profileId && !team[p.id] ? ' · ne partage pas' : ''}</small></span>
        </div>
      ))}
    </div>
  );
}

// ---------- Disponibilités ----------
const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const DAY_FULL = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
/** Décalage (en heures) entre Paris et un fuseau, à l'instant présent (gère les changements d'heure). */
function offsetFromParis(tz: string) {
  const at = (z: string) => { const s = new Date().toLocaleString('sv-SE', { timeZone: z }).replace(' ', 'T'); return Date.parse(s + 'Z'); };
  return Math.round((at('Europe/Paris') - at(tz)) / 3_600_000);
}
const canada = (): { tz: string; label: string } => { try { const c = JSON.parse(localStorage.getItem('fzth:v2:clock') ?? 'null'); if (c?.tz) return c; } catch { /* ignore */ } return { tz: 'America/Toronto', label: 'Canada' }; };
const toParis = (d: number, h: number, off: number) => { const i = ((d * 24 + h + off) % 168 + 168) % 168; return `${Math.floor(i / 24)}-${i % 24}`; };

export function Availability({ profileId }: { profileId: number }) {
  const { avail } = useTeamLive();
  const ca = canada();
  const [zone, setZone] = useState<'fr' | 'ca'>('fr');
  const tz = zone === 'fr' ? 'Europe/Paris' : ca.tz;
  const off = offsetFromParis(tz); // Paris = zone + off
  const offCa = offsetFromParis(ca.tz);
  const mine = new Set(avail.find(a => a.profile_id === profileId)?.slots ?? []);
  const myNote = avail.find(a => a.profile_id === profileId)?.note ?? '';
  const sets = profiles.map(p => ({ p, s: new Set(avail.find(a => a.profile_id === p.id)?.slots ?? []) }));
  const paint = useRef<boolean | null>(null);
  const apply = (slot: string, on: boolean) => {
    const n = new Set(mine); on ? n.add(slot) : n.delete(slot);
    setMyAvail([...n], myNote || null);
  };
  // Créneaux où tout le monde est libre, regroupés en plages (affichés dans la zone choisie + l'autre).
  const ranges = useMemo(() => {
    const out: { d: number; from: number; to: number; n: number }[] = [];
    for (let d = 0; d < 7; d++) {
      let start = -1;
      for (let h = 0; h <= 24; h++) {
        const slot = h < 24 ? toParis(d, h, off) : '';
        const n = h < 24 ? sets.filter(x => x.p.team !== false && x.s.has(slot)).length : 0;
        if (n === teamProfiles.length && start < 0) start = h;
        if (n !== teamProfiles.length && start >= 0) { out.push({ d, from: start, to: h, n }); start = -1; }
      }
    }
    return out;
  }, [avail, off]); // eslint-disable-line react-hooks/exhaustive-deps
  const other = (d: number, h: number) => { // même instant dans l'autre zone
    const delta = zone === 'fr' ? -offCa : offCa;
    const i = ((d * 24 + h + delta) % 168 + 168) % 168; return { d: Math.floor(i / 24), h: i % 24 };
  };
  return (
    <section className="avail">
      <div className="detail-head">
        <div><h2>🗓 Disponibilités de la semaine</h2><p className="meta small">Clique (ou glisse) sur tes créneaux libres. Les heures s’affichent dans la zone choisie : chacun peut remplir à son heure locale.</p></div>
        <div className="row">
          <button className={zone === 'fr' ? 'on' : ''} onClick={() => setZone('fr')}>🇫🇷 Heure de France</button>
          <button className={zone === 'ca' ? 'on' : ''} onClick={() => setZone('ca')}>🇨🇦 Heure {ca.label ? `(${ca.label})` : 'du Canada'}</button>
          <button onClick={() => void loadAvail()} title="Recharger">↻</button>
        </div>
      </div>
      <div className="legend row small">{profiles.map(p => <span key={p.id} className="lg" data-world={p.world}><i />{p.name}</span>)}<span className="lg all"><i />Tout le monde libre</span></div>
      <div className="avail-grid" onMouseLeave={() => (paint.current = null)} onMouseUp={() => (paint.current = null)}>
        <span />{DAYS.map(d => <span key={d} className="dh">{d}</span>)}
        {Array.from({ length: 24 }, (_, h) => (
          <FragmentRow key={h} h={h}>
            {DAYS.map((_, d) => {
              const slot = toParis(d, h, off);
              const who = sets.filter(x => x.s.has(slot));
              const meOn = mine.has(slot);
              return (
                <button key={d} className={`cell${meOn ? ' me' : ''}${who.length >= teamProfiles.length ? ' all' : ''}`}
                  title={`${DAY_FULL[d]} ${h} h : ${who.map(x => x.p.name).join(', ') || 'personne'}`}
                  onMouseDown={() => { paint.current = !meOn; apply(slot, !meOn); }}
                  onMouseEnter={() => { if (paint.current !== null) apply(slot, paint.current); }}>
                  {who.map(x => <i key={x.p.id} data-world={x.p.world} />)}
                </button>
              );
            })}
          </FragmentRow>
        ))}
      </div>
      <label className="note">Remarque <input value={myNote} maxLength={200} placeholder="Ex. dispo surtout le week-end" onChange={e => setMyAvail([...mine], e.target.value || null)} /></label>
      {avail.filter(a => a.note && a.profile_id !== profileId).map(a => <p key={a.profile_id} className="meta small">💬 {profiles.find(p => p.id === a.profile_id)?.name} : {a.note}</p>)}
      <div className="common">
        <h3>Créneaux communs aux {teamProfiles.length}</h3>
        {ranges.length ? ranges.map((r, k) => {
          const a = other(r.d, r.from), b = other(r.d, r.to % 24);
          return <p key={k}>✨ <strong>{cap(DAY_FULL[r.d])} {r.from} h – {r.to} h</strong> <small>({zone === 'fr' ? ca.label || 'Canada' : 'France'} : {DAY_FULL[a.d]} {a.h} h – {b.h} h)</small></p>;
        }) : <p className="meta">Pas encore de créneau où vous êtes libres tous les trois.</p>}
      </div>
    </section>
  );
}
function FragmentRow({ h, children }: { h: number; children: React.ReactNode }) {
  return <><span className="hh">{h} h</span>{children}</>;
}

// ---------- Répartition de la récolte ----------
export function ClaimButton({ itemId, profileId }: { itemId: string; profileId: number }) {
  const { claimOf } = useTeamLive();
  const owner = claimOf(itemId);
  const p = profiles.find(x => x.id === owner);
  if (owner === undefined) return <button type="button" className="claim-btn" onClick={() => void setClaim(itemId, true)} title="Je m’occupe de récolter cette ressource">✋</button>;
  if (owner === profileId) return <button type="button" className="claim-btn mine" onClick={() => void setClaim(itemId, false)} title="C’est toi qui t’en occupes (cliquer pour libérer)">✋ moi</button>;
  return <span className="claim-btn other" title={`${p?.name} s’en occupe`}><img src={avatar(p!.image)} alt="" /></span>;
}

export function Harvest({ profileId }: { profileId: number }) {
  const { claimOf } = useTeamLive();
  const { team } = teamInfo();
  const counted = teamProfiles.filter(p => p.id === profileId || team[p.id]);
  useJobLevels();
  const rows = allJobRes(teamProfiles.map(p => p.id), isDone).map(x => {
    const k = jobKey(x.name); const need = x.qty;
    const have = counted.reduce((s, p) => s + (qtyOf(p.id, k) ?? 0), 0);
    return { ...x, k, need, have, missing: Math.max(0, need - have), owner: claimOf(k) };
  }).filter(r => r.missing > 0).sort((a, b) => b.missing - a.missing);
  const groups: [string, typeof rows][] = [
    ['✋ Ce que je récolte', rows.filter(r => r.owner === profileId)],
    ['🌾 Personne ne s’en occupe encore', rows.filter(r => r.owner === undefined)],
    ...profiles.filter(p => p.id !== profileId).map(p => [`${p.name} s’en occupe`, rows.filter(r => r.owner === p.id)] as [string, typeof rows]),
  ];
  return (
    <section className="harvest">
      <h2>🌾 Répartition de la récolte</h2>
      <p className="meta small">Ressources des métiers qui manquent encore à l’équipe (besoin pour les {teamProfiles.length} personnages, paliers déjà faits exclus − ce que vous avez). Prends une ressource avec ✋ : les autres savent que tu t’en occupes.</p>
      {groups.map(([title, list]) => list.length ? (
        <div key={title} className="harvest-group">
          <h3>{title} <small>({list.length})</small></h3>
          <ul>{list.map(r => (
            <li key={r.k}><ResIcon name={r.name} size={20} /><span className="rname">{r.name}</span>
              <span className="missing">−{r.missing.toLocaleString('fr-FR')}</span><small className="meta">{r.have.toLocaleString('fr-FR')} / {r.need.toLocaleString('fr-FR')}</small>
              <ClaimButton itemId={r.k} profileId={profileId} /></li>
          ))}</ul>
        </div>
      ) : null)}
      {!rows.length && <p className="meta">Plus rien ne manque pour les métiers 🎉</p>}
    </section>
  );
}

// ---------- Succès de donjon à plusieurs ----------
const nrm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
const DJ_KEYS = dungeons.map(d => {
  const boss = d.ach[0]?.desc.match(/Vaincre (?:le |la |les |l'|l’)?(.+?) dans son donjon/i)?.[1] ?? '';
  return { d, keys: [nrm(d.name), nrm(boss)].filter(k => k.length > 3) };
});
/** Donjon du jeu correspondant à un libellé de nos quêtes (« Reine Nyée », « Antre de la Reine Nyée »…). */
export function dungeonFor(label: string) {
  const k = nrm(label); if (k.length < 4) return undefined;
  return DJ_KEYS.find(x => x.keys.some(y => y === k || y.includes(k) || k.includes(y)))?.d;
}

/** Clé du donjon (recette) + plan des passages pour cumuler les succès restants. */
export function DungeonExtras({ d, todo }: { d: (typeof dungeons)[number]; todo: (typeof dungeons)[number]['ach'] }) {
  const key = dungeonKeys[d.id];
  const runs = planRuns(todo);
  return (
    <div className="dj-extras">
      {key && (
        <details className="dj-key">
          <summary>🗝 {key.name} <small className="meta">({key.recipe.length} ingrédients)</small></summary>
          <ul>{key.recipe.map(([n, q]) => <li key={n}><ResIcon name={n} size={20} /> {q} × {n}</li>)}</ul>
        </details>
      )}
      {runs.length > 0 && (
        <div className="dj-plan">
          <strong>🗺 Plan conseillé : {runs.length} passage{runs.length > 1 ? 's' : ''} pour {todo.length} succès</strong>
          <ol>{runs.map((r, i) => (
            <li key={i}>
              <span className="meta small">{r.players === 1 ? '👤 seul' : r.players === 2 ? '👥 à 2' : r.players === 3 ? '👥👤 à 3' : 'à 1, 2 ou 3'}</span>
              {r.achs.map(a => <span key={a.id} className="chip">{challengeOf(a) ?? 'Boss'} · {a.pts} pts</span>)}
            </li>
          ))}</ol>
          <p className="meta small">Regroupement indicatif : en jeu, vérifie que les challenges choisis sont bien proposés ensemble.</p>
        </div>
      )}
    </div>
  );
}

export function DungeonAchievements({ profileId, isDone }: { profileId: number; isDone: IsDone }) {
  const { team } = teamInfo();
  const { open } = useGoals();
  const members = profiles.filter(p => p.id === profileId || team[p.id]);
  const [q, setQ] = useState('');
  const [onlyOurs, setOnlyOurs] = useState(true);
  const [onlyTodo, setOnlyTodo] = useState(true);
  const [openId, setOpenId] = useState<number | null>(null);
  // « Nos donjons » : ceux des objectifs en cours.
  const ours = useMemo(() => {
    const ids = new Set<number>();
    for (const g of open) for (const id of g.item_ids) {
      const it = getItem(id); if (!it) continue;
      const labels = [it.dungeon?.name, ...(it.objectives ?? []).filter(o => o.type === 'donjon').map(o => o.label)].filter(Boolean) as string[];
      for (const l of labels) { const d = dungeonFor(l); if (d) ids.add(d.id); }
    }
    return ids;
  }, [open]);
  const key = (id: number) => `ach:${id}`;
  const todo = (aid: number) => members.some(m => !isDone(m.id, key(aid)));
  const list = dungeons.filter(d => (!q || nrm(d.name).includes(nrm(q)) || d.ach.some(a => nrm(a.name).includes(nrm(q))))
    && (!onlyOurs || q || ours.has(d.id)) && (!onlyTodo || d.ach.some(a => todo(a.id))));
  return (
    <section className="dj-ach">
      <h2>🏆 Succès de donjon à plusieurs</h2>
      <div className="row">
        <input className="dj-search" value={q} onChange={e => setQ(e.target.value)} placeholder="Chercher un donjon ou un boss…" />
        <label className="toggle"><input type="checkbox" checked={onlyOurs} onChange={e => setOnlyOurs(e.target.checked)} /> Donjons de nos objectifs ({ours.size})</label>
        <label className="toggle"><input type="checkbox" checked={onlyTodo} onChange={e => setOnlyTodo(e.target.checked)} /> Pas encore faits par tous</label>
      </div>
      {onlyOurs && !q && !ours.size && <p className="meta">Aucun donjon dans les objectifs en cours : crée un objectif, ou décoche ce filtre pour voir les {dungeons.length} donjons.</p>}
      <ul className="dj-list">
        {list.map(d => {
          const done = d.ach.filter(a => isDone(profileId, key(a.id))).length;
          const isOpen = openId === d.id || list.length <= 3;
          return (
            <li key={d.id} className={ours.has(d.id) ? 'ours' : ''}>
              <button className="dj-head" onClick={() => setOpenId(isOpen && openId === d.id ? null : d.id)}>
                <BossImg gfx={dungeonBosses[d.id]?.[0]?.g} id={dungeonBosses[d.id]?.[0]?.id} size={36} name={dungeonBosses[d.id]?.[0]?.n} />
                <strong>{d.name}</strong> <small>niv. {d.lvl}</small>{ours.has(d.id) && <span className="chip quest">🎯 objectif</span>}
                <span className="meta small">{done}/{d.ach.length} pour toi</span>
              </button>
              {isOpen && <DungeonExtras d={d} todo={d.ach.filter(a => todo(a.id))} />}
              {isOpen && (
                <ul className="ach-list">{d.ach.filter(a => !onlyTodo || todo(a.id)).map(a => (
                  <li key={a.id} className={isDone(profileId, key(a.id)) ? 'done' : ''}>
                    <label><input type="checkbox" checked={isDone(profileId, key(a.id))} onChange={() => toggle(profileId, key(a.id))} />
                      <span><strong>{a.name}</strong> <small className="pts">{a.pts} pts</small><br /><small className="meta">{a.tip || a.desc}</small></span></label>
                    <span className="who">{members.filter(m => m.id !== profileId).map(m => <span key={m.id} className={isDone(m.id, key(a.id)) ? 'ok' : 'todo'} title={m.name}>{m.name[0]}{isDone(m.id, key(a.id)) ? '✓' : '·'}</span>)}</span>
                  </li>
                ))}</ul>
              )}
            </li>
          );
        })}
      </ul>
      <p className="meta small">Données du jeu Dofus Unity {GAME_VERSION} (données publiques dofusdude). Coche les succès que tu as : ceux qui restent à faire à plusieurs ressortent.</p>
    </section>
  );
}
