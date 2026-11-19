// Onglet Succès : catalogue complet, presque finis, donjons (clé + plan), classement de l'équipe, événements à ne pas rater.
import { useMemo, useState } from 'react';
import { AlarmClock, Castle, Hourglass, Medal, ScrollText, Star, Compass, Skull, BookOpen, Hammer, PawPrint, PartyPopper, Swords, Clock4, Moon, Shield, Users, Gem } from 'lucide-react';
import { burst } from './model/celebrate';
import type { Ach } from './data/jeu/succes';
import { GAME_VERSION } from './data/jeu/donjons';
import { achKey, achProgress, almostDone, eventStatus, norm, objDone, objKey, pointsOf, useAchData, type AchData, type IsDone } from './model/achievements';
import { catalog } from './model/catalog';
import { viewFor } from './model/choices';
import { profiles } from './model/profiles';
import { teamInfo, toggle } from './model/progress';
import { DungeonAchievements } from './TeamLive';

const TABS: [string, string, typeof ScrollText][] = [['all', 'Tous les succès', ScrollText], ['almost', 'Presque finis', Hourglass], ['dj', 'Donjons', Castle], ['rank', 'Classement', Medal], ['alerts', 'À ne pas rater', AlarmClock]];
const CAT_ICON: Record<string, typeof Star> = { 'Général': Star, 'Exploration': Compass, 'Donjons': Castle, 'Monstres': Skull, 'Quêtes': BookOpen, 'Métiers': Hammer, 'Élevage': PawPrint,
  'Événements': PartyPopper, 'Kolizéum': Swords, 'Anomalies Temporelles': Clock4, 'Songes Infinis': Moon, 'Guilde': Shield, 'Compagnons': Users };
const catIcon = (name: string) => CAT_ICON[name] ?? Gem;
/** Médaille selon le pourcentage de points obtenus dans la catégorie. */
const medal = (pct: number) => pct >= 90 ? 'gold' : pct >= 50 ? 'silver' : pct >= 25 ? 'bronze' : null;
const avatar = (img: string) => `${import.meta.env.BASE_URL}persos/${img}`;

export function Achievements({ profileId, isDone }: { profileId: number; isDone: IsDone }) {
  const [tab, setTab] = useState(() => { try { return localStorage.getItem('fzth:v2:achTab') ?? 'all'; } catch { return 'all'; } });
  const pick = (t: string) => { setTab(t); try { localStorage.setItem('fzth:v2:achTab', t); } catch { /* ignore */ } };
  const d = useAchData();
  const mine = d && pointsOf(d, profileId, isDone);
  return (
    <main className="succes panel">
      <div className="detail-head">
        <div><p className="eyebrow">Chasse aux succès</p><h2>Succès</h2></div>
        {d && mine && <div className="ach-score"><strong>{mine.pts.toLocaleString('fr-FR')}</strong><span>points · {mine.n}/{d.list.length} succès</span></div>}
      </div>
      <nav className="tabs always">{TABS.map(([k, l, I]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => pick(k)}><I size={15} /> {l}</button>)}</nav>
      {!d && tab !== 'dj' ? <div className="skeleton-list">{Array.from({ length: 6 }, (_, i) => <span key={i} className="skeleton" />)}</div> : (
        <div className="ach-body">
          {tab === 'all' && d && <Catalogue d={d} profileId={profileId} isDone={isDone} />}
          {tab === 'almost' && d && <Almost d={d} profileId={profileId} isDone={isDone} />}
          {tab === 'dj' && <DungeonAchievements profileId={profileId} isDone={isDone} />}
          {tab === 'rank' && d && <Ranking d={d} profileId={profileId} isDone={isDone} />}
          {tab === 'alerts' && d && <Alerts d={d} profileId={profileId} isDone={isDone} />}
        </div>
      )}
      <p className="meta small">Données du jeu Dofus Unity {GAME_VERSION} (données publiques dofusdude), hors Temporis. Le site ne lit pas ton compte : coche ce que tu as déjà.</p>
    </main>
  );
}

/** Une ligne de succès : case, nom, points, description, objectifs dépliables. */
export function AchRow({ d, a, profileId, isDone, showCat }: { d: AchData; a: Ach; profileId: number; isDone: IsDone; showCat?: boolean }) {
  const [open, setOpen] = useState(false);
  const pr = achProgress(d, a, profileId, isDone);
  const { team } = teamInfo();
  const mates = profiles.filter(p => p.id !== profileId && team[p.id]);
  return (
    <li className={`ach-row${pr.complete ? ' done' : ''}${open ? ' open' : ''}`}>
      <div className="ach-main">
        <input type="checkbox" checked={pr.complete} onChange={e => { if (!pr.complete) burst(e.currentTarget, true); toggle(profileId, achKey(a.id)); }} title="J’ai ce succès" />
        <div className="ach-txt">
          <strong>{a.n}</strong>
          <small>{showCat && <em>{d.top(a.c).name}{d.catOf.get(a.c)!.parent ? ` › ${d.catOf.get(a.c)!.name}` : ''} · </em>}{a.d}</small>
        </div>
        {a.o && (
          <button type="button" className="ach-prog" onClick={() => setOpen(!open)} title="Voir les objectifs">
            <span>{pr.done}/{pr.total}</span><i><b style={{ width: `${(pr.done / pr.total) * 100}%` }} /></i>{open ? '▴' : '▾'}
          </button>
        )}
        {mates.length > 0 && <span className="who">{mates.map(m => <img key={m.id} src={avatar(m.image)} alt={m.name} title={`${m.name} : ${isDone(m.id, achKey(a.id)) ? 'fait' : 'pas encore'}`} className={isDone(m.id, achKey(a.id)) ? 'ok' : 'no'} />)}</span>}
        <span className="pts">{a.p}</span>
      </div>
      {open && a.o && (
        <ul className="ach-objs">{a.o.map((o, i) => {
          const done = objDone(d, a, i, profileId, isDone);
          const auto = done && !isDone(profileId, objKey(a.id, i));
          return <li key={i} className={done ? 'done' : ''}><label><input type="checkbox" checked={done} disabled={auto} onChange={() => toggle(profileId, objKey(a.id, i))} /> {o}{auto && <small className="meta"> (succès validé)</small>}</label></li>;
        })}</ul>
      )}
      {!pr.complete && a.o && pr.done === pr.total && <p className="ach-ready">✅ Tous les objectifs sont faits : coche le succès !</p>}
    </li>
  );
}


function Catalogue({ d, profileId, isDone }: { d: AchData; profileId: number; isDone: IsDone }) {
  const tops = d.cats.filter(c => !c.parent);
  const [cat, setCat] = useState(tops[0]?.id ?? 0);
  const [q, setQ] = useState('');
  const [showDone, setShowDone] = useState(false);
  const stats = useMemo(() => new Map(tops.map(t => {
    const l = d.list.filter(a => d.top(a.c).id === t.id);
    const pts = l.reduce((s, a) => s + a.p, 0), got = l.filter(a => isDone(profileId, achKey(a.id))).reduce((s, a) => s + a.p, 0);
    return [t.id, { n: l.length, pct: pts ? Math.round((got / pts) * 100) : 0 }];
  })), [d, profileId, isDone, tops]);
  const nq = norm(q);
  const list = d.list.filter(a => (nq ? norm(a.n + ' ' + a.d).includes(nq) : d.top(a.c).id === cat) && (showDone || !isDone(profileId, achKey(a.id))));
  const groups = nq ? [{ id: -1, name: `Résultats pour « ${q} »`, items: list.slice(0, 150) }]
    : d.cats.filter(c => c.id === cat || d.top(c.id).id === cat).map(c => ({ id: c.id, name: c.id === cat ? 'Général' : c.name, items: list.filter(a => a.c === c.id) })).filter(g => g.items.length);
  const hidden = (nq ? d.list.filter(a => norm(a.n + ' ' + a.d).includes(nq)) : d.list.filter(a => d.top(a.c).id === cat)).filter(a => isDone(profileId, achKey(a.id))).length;
  return (
    <div className="ach-cat-layout">
      <nav className="ach-cats">
        {tops.map(t => (
          <button key={t.id} className={cat === t.id && !nq ? 'on' : ''} onClick={() => { setCat(t.id); setQ(''); }}>
            {(() => { const I = catIcon(t.name); const m = medal(stats.get(t.id)?.pct ?? 0); return <span className={`cat-ic${m ? ' m-' + m : ''}`} title={m ? `Médaille ${m === 'gold' ? 'd’or' : m === 'silver' ? 'd’argent' : 'de bronze'}` : undefined}><I size={16} /></span>; })()}
            <span className="cat-name">{t.name}</span><small>{stats.get(t.id)?.pct ?? 0} %</small>
            <i style={{ width: `${stats.get(t.id)?.pct ?? 0}%` }} />
          </button>
        ))}
      </nav>
      <section className="ach-main-col">
        <div className="row">
          <input className="dj-search" value={q} onChange={e => setQ(e.target.value)} placeholder="Chercher un succès (nom, boss, zone…)" />
          {hidden > 0 && <label className="toggle"><input type="checkbox" checked={showDone} onChange={e => setShowDone(e.target.checked)} /> Voir les succès déjà obtenus ({hidden})</label>}
        </div>
        {groups.map(g => (
          <div key={g.id} className="ach-group">
            <h3 className="ach-gh"><span>{g.name}</span><small>{g.items.length}</small></h3>
            <ul className="ach-rows">{g.items.map(a => <AchRow key={a.id} d={d} a={a} profileId={profileId} isDone={isDone} showCat={!!nq} />)}</ul>
          </div>
        ))}
        {!groups.length && <p className="done-all">🎉 Rien à faire ici{showDone ? '' : ' (les succès obtenus sont masqués)'} !</p>}
      </section>
    </div>
  );
}

function Almost({ d, profileId, isDone }: { d: AchData; profileId: number; isDone: IsDone }) {
  const list = almostDone(d, profileId, isDone).slice(0, 60);
  return (
    <section>
      <p className="meta">Les succès dont tu as fait au moins la moitié des objectifs, ceux qui sont le plus près de la fin en premier. Les objectifs qui sont eux-mêmes des succès se cochent tout seuls quand tu valides ces succès.</p>
      {list.length ? <ul className="ach-rows">{list.map(x => <AchRow key={x.a.id} d={d} a={x.a} profileId={profileId} isDone={isDone} showCat />)}</ul>
        : <p className="meta">Rien pour l’instant : coche des objectifs dans « Tous les succès » (ou des succès de donjon) et ceux qui approchent de la fin apparaîtront ici.</p>}
    </section>
  );
}

function Ranking({ d, profileId, isDone }: { d: AchData; profileId: number; isDone: IsDone }) {
  const { team } = teamInfo();
  const known = profiles.filter(p => p.id === profileId || team[p.id]);
  const tops = d.cats.filter(c => !c.parent);
  const rows = known.map(p => {
    const { pts, n } = pointsOf(d, p.id, isDone);
    let eggs = 0, quests = 0;
    for (const raw of catalog) { const v = viewFor(raw, p.id, isDone); const k = v.itemIds.filter(id => isDone(p.id, id)).length; quests += k; if (v.itemIds.length && k === v.itemIds.length) eggs++; }
    const byCat = new Map(tops.map(t => [t.id, d.list.filter(a => d.top(a.c).id === t.id && isDone(p.id, achKey(a.id))).reduce((s, a) => s + a.p, 0)]));
    return { p, pts, n, eggs, quests, byCat };
  }).sort((a, b) => b.pts - a.pts || b.eggs - a.eggs);
  const medals = ['🥇', '🥈', '🥉'];
  return (
    <section className="ranking">
      <div className="podium">{rows.map((r, i) => (
        <div key={r.p.id} className={`pod${r.p.id === profileId ? ' me' : ''}`} data-world={r.p.world}>
          <span className="medal">{medals[i]}</span>
          <img src={avatar(r.p.image)} alt="" />
          <strong>{r.p.name}</strong>
          <span className="pod-pts">{r.pts.toLocaleString('fr-FR')} pts</span>
          <small className="meta">{r.n} succès · 🥚 {r.eggs} Dofus · {r.quests} quêtes</small>
        </div>
      ))}</div>
      {rows.length < profiles.length && <p className="meta small">{profiles.filter(p => !rows.some(r => r.p.id === p.id)).map(p => p.name).join(' et ')} n’apparai{profiles.length - rows.length > 1 ? 'ssent' : 't'} pas : progression pas encore partagée.</p>}
      {rows.length > 1 && (
        <>
          <h3>Qui est en avance sur quoi ?</h3>
          <ul className="lead-list">{tops.map(t => {
            const best = [...rows].sort((a, b) => b.byCat.get(t.id)! - a.byCat.get(t.id)!);
            if (!best[0].byCat.get(t.id)) return null;
            return <li key={t.id}><span>{t.name}</span><span>{best.map(b => <span key={b.p.id} className={b === best[0] ? 'lead' : ''}>{b.p.name} {b.byCat.get(t.id)} pts</span>)}</span></li>;
          })}</ul>
        </>
      )}
    </section>
  );
}

function Alerts({ d, profileId, isDone }: { d: AchData; profileId: number; isDone: IsDone }) {
  const ev = eventStatus(d, profileId, isDone);
  const alm = d.cats.find(c => c.name === 'Almanax');
  const almList = alm ? d.list.filter(a => a.c === alm.id && !isDone(profileId, achKey(a.id))) : [];
  const [open, setOpen] = useState<string | null>(null);
  return (
    <section className="alerts">
      <p className="meta">Les succès qu’on ne peut faire qu’à certaines périodes. Les dates des événements changent chaque année : ce sont des estimations.</p>
      {ev.map(x => (
        <div key={x.e.cat} className={`alert-card${x.days === 0 ? ' now' : x.days < 45 ? ' soon' : ''}`}>
          <button className="alert-head" onClick={() => setOpen(open === x.e.cat ? null : x.e.cat)}>
            <strong>{x.e.label}</strong>
            <span className="meta">{x.days === 0 ? '🔥 c’est la période !' : `dans ~${x.days} jours`} · {x.e.hint}</span>
            <span className="chip">{x.left.length}/{x.list.length} à faire · {x.pts} pts</span>
          </button>
          {open === x.e.cat && <ul className="ach-rows">{x.left.map(a => <AchRow key={a.id} d={d} a={a} profileId={profileId} isDone={isDone} />)}</ul>}
        </div>
      ))}
      <div className="alert-card">
        <button className="alert-head" onClick={() => setOpen(open === 'alm' ? null : 'alm')}>
          <strong>Almanax</strong><span className="meta">toute l’année : une offrande par jour (voir l’onglet Almanax)</span>
          <span className="chip">{almList.length} succès à faire</span>
        </button>
        {open === 'alm' && <ul className="ach-rows">{almList.map(a => <AchRow key={a.id} d={d} a={a} profileId={profileId} isDone={isDone} />)}</ul>}
      </div>
    </section>
  );
}
