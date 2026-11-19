// Page « Outils » : reprise de la boîte à outils de l'ancien site.
import { ReportList } from './Report';
import { useState } from 'react';
import { profiles } from './model/profiles';
import { useStuffs } from './model/stuffs';

const SOLVERS = [
  { icon: '🐉', name: 'Bolgrot', desc: 'Résolution du combat à partir d’une capture d’écran au tour 6', url: 'https://solver.barbofus.com/bolgrot/' },
  { icon: '🗿', name: 'Minogolem', desc: 'Prédictions et séquences d’actions à suivre', url: 'https://solver.barbofus.com/minogolem/' },
  { icon: '🌸', name: 'Rainikrone', desc: 'Résolution de la grille avec import de capture d’écran', url: 'https://solver.barbofus.com/rainikrone/' },
];
const HUNT = 'https://www.dofuspourlesnoobs.com/resolution-de-chasse-aux-tresors.html';

export function Tools({ profileId }: { profileId: number }) {
  const { list, online, add, remove } = useStuffs(profileId);
  const [name, setName] = useState(''); const [url, setUrl] = useState(''); const [err, setErr] = useState('');
  const submit = (e: React.FormEvent) => {
    e.preventDefault(); setErr('');
    if (!name.trim()) return setErr('Donne un nom au stuff.');
    if (!/^https:\/\/\S+$/.test(url.trim())) return setErr('Colle un lien qui commence par https://');
    void add(name.trim(), url.trim()); setName(''); setUrl('');
  };
  return (
    <main className="tools panel">
      <p className="eyebrow">La boîte à outils</p>
      <h2>Outils d’aventuriers</h2>
      <p className="meta">Des outils simples, partagés entre les trois personnages.</p>
      <div className="toolgrid">
        <ReportList profileId={profileId} />
        <section className="toolbox">
          <h3>🧭 Chasse aux trésors</h3>
          <p className="meta">Résolution des indices : position de départ, direction et indice, sur Dofus pour les Noobs.</p>
          <a className="link-button" href={HUNT} target="_blank" rel="noreferrer">Ouvrir le résolveur ↗</a>
          <iframe loading="lazy" title="Résolveur de chasses aux trésors" src={HUNT} />
          <p className="meta small">Si le site bloque l’affichage ici, utilise le bouton au-dessus.</p>
        </section>

        <section className="toolbox">
          <h3>🧩 Solveurs de combats</h3>
          <div className="solvers">
            {SOLVERS.map(s => (
              <a key={s.name} className="solver" href={s.url} target="_blank" rel="noreferrer">
                <span className="solver-icon">{s.icon}</span>
                <span><strong>{s.name}</strong><small>{s.desc}</small></span><span aria-hidden>↗</span>
              </a>
            ))}
          </div>
        </section>

        <section className="toolbox">
          <h3>🛡️ Bibliothèque DofusBook</h3>
          <form className="stuff-form" onSubmit={submit}>
            <input value={name} onChange={e => setName(e.target.value)} maxLength={90} placeholder="Nom du stuff (ex. Féca terre PvM)" />
            <input value={url} onChange={e => setUrl(e.target.value)} type="url" placeholder="https://www.dofusbook.net/…" />
            <button className="primary" type="submit">Enregistrer ce stuff</button>
            {err && <p className="warn">{err}</p>}
          </form>
          {online === false && <p className="meta small">Serveur injoignable : les stuffs ajoutés restent sur cet appareil et seront partagés plus tard.</p>}
          <ul className="stuff-list">
            {list.map(s => {
              const who = profiles.find(p => p.id === s.profile_id);
              return (
                <li key={s.id}>
                  <a href={s.url} target="_blank" rel="noreferrer">{s.name} ↗</a>
                  <small>{who?.name}{s.local ? ' · sur cet appareil' : ''}</small>
                  <button onClick={() => void remove(s)} title="Supprimer">✕</button>
                </li>
              );
            })}
            {!list.length && <li className="meta">Aucun stuff enregistré pour l’instant.</li>}
          </ul>
        </section>
      </div>
    </main>
  );
}
