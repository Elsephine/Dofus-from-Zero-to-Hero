// Niveaux de métier de chacun, bien visibles : sur la page Aujourd'hui et en tête de Métiers.
import { Hammer } from 'lucide-react';
import { jobs } from './data/metiers';
import { jobLevel, jobLvlKey, myJobLevel, useJobLevels } from './model/jobs';
import { profiles } from './model/profiles';
import { setQty, teamInfo, useProgress } from './model/progress';

export const openJobTab = (name: string) => { try { sessionStorage.setItem('fzth:v2:jobTab', name); } catch { /* ignore */ } };

export function JobLevels({ profileId, onOpenJob, compact }: { profileId: number; onOpenJob: (name: string) => void; compact?: boolean }) {
  useProgress(); useJobLevels();
  const { team } = teamInfo();
  const mates = profiles.filter(p => p.id !== profileId && team[p.id]);
  return (
    <section className={'panel job-levels' + (compact ? ' compact' : '')}>
      <h3><Hammer size={17} /> Mes niveaux de métier</h3>
      <div className="jl-grid">
        {jobs.map(j => {
          const lvl = myJobLevel(profileId, j.name); const goal = jobLevel(j); const pct = Math.min(100, Math.round(lvl / goal * 100));
          return (
            <div key={j.name} className={'jl-card' + (lvl >= goal ? ' done' : '')}>
              <button className="jl-name" onClick={() => onOpenJob(j.name)} title="Voir ce métier">{j.name}</button>
              <div className="jl-lvl">
                <input type="number" min={0} max={200} value={lvl || ''} placeholder="?" aria-label={`Niveau ${j.name}`}
                  onChange={e => setQty(profileId, jobLvlKey(j.name), Math.max(0, Math.min(200, Number(e.target.value) || 0)), Infinity)} />
                <small>/ {goal}</small>
              </div>
              <span className="bar"><span style={{ width: `${pct}%` }} /></span>
              {mates.length > 0 && <div className="jl-mates">{mates.map(p => {
                const l = myJobLevel(p.id, j.name);
                return <span key={p.id} className="lvl-chip" data-world={p.world} title={`${p.name} : ${l ? 'niveau ' + l : 'pas encore indiqué'}`}><img src={`${import.meta.env.BASE_URL}persos/${p.image}`} alt="" />{l || '?'}</span>;
              })}</div>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
