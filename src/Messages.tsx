// Page « Messages » : discussion d'équipe, offres de ressources en surplus et annonces.
import { useEffect, useMemo, useRef, useState } from 'react';
import { profiles } from './model/profiles';
import { markRead, post, useMessages, type Message } from './model/messages';

const QUICK = ['Je suis connecté(e), qui est dispo ? 👋', 'Qui vient faire un donjon ?', 'J’ai fini ma session, à plus ! 🌙', 'Besoin d’aide pour une quête !'];

export function Messages({ profileId }: { profileId: number }) {
  const { list, online } = useMessages();
  const [text, setText] = useState('');
  const [offerName, setOfferName] = useState(''); const [offerQty, setOfferQty] = useState('');
  const bottom = useRef<HTMLDivElement>(null);
  const me = profiles.find(p => p.id === profileId)!;
  const ordered = useMemo(() => [...list].reverse(), [list]); // le plus récent en bas
  const takes = useMemo(() => new Map(list.filter(m => m.kind === 'take' && m.ref).map(m => [m.ref!, m])), [list]);

  useEffect(() => { markRead(profileId); bottom.current?.scrollIntoView({ block: 'end' }); }, [list.length, profileId]);

  const send = (e: React.FormEvent) => { e.preventDefault(); if (text.trim()) { void post('text', text); setText(''); } };
  const offer = (e: React.FormEvent) => {
    e.preventDefault(); const n = offerName.trim(); if (!n) return;
    const q = offerQty.trim();
    void post('offer', `${me.name} propose de donner ${q ? `${q} × ${n}` : `du ${n}`} en supplément`, n);
    setOfferName(''); setOfferQty('');
  };
  const take = (m: Message) => {
    const from = profiles.find(p => p.id === m.profile_id)?.name;
    void post('take', `${me.name} prend l’offre de ${from} : ${m.ref}`, m.id);
  };
  const time = (iso: string) => new Date(iso).toLocaleString('fr-FR', { weekday: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <main className="messages panel">
      <p className="eyebrow">Entre aventuriers</p>
      <h2>💬 Messages</h2>
      {online === false && <p className="meta small">Serveur injoignable : tes messages partiront dès le retour de la connexion.</p>}
      <div className="msg-list">
        {ordered.map(m => {
          const who = profiles.find(p => p.id === m.profile_id);
          const mine = m.profile_id === profileId;
          const takenBy = m.kind === 'offer' ? takes.get(m.id) : undefined;
          return (
            <div key={m.id} className={`msg ${m.kind}${mine ? ' mine' : ''}`} data-world={who?.world}>
              {who && <img className="avatar" src={`${import.meta.env.BASE_URL}persos/${who.image}`} alt="" />}
              <div className="bubble">
                <div className="msg-head"><strong>{who?.name}</strong> <small>{time(m.created_at)}{m.local ? ' · en attente' : ''}</small></div>
                <div className="msg-body">{m.kind === 'offer' && '🎁 '}{m.kind === 'done' && '🎉 '}{m.kind === 'take' && '🤝 '}{m.body}</div>
                {m.kind === 'offer' && (takenBy
                  ? <small className="taken">✓ Pris par {profiles.find(p => p.id === takenBy.profile_id)?.name}</small>
                  : !mine && !m.local && <button className="primary small-btn" onClick={() => take(m)}>Je prends</button>)}
              </div>
            </div>
          );
        })}
        {!ordered.length && <p className="meta">Aucun message pour l’instant. Lance la discussion !</p>}
        <div ref={bottom} />
      </div>

      <div className="quick">{QUICK.map(q => <button key={q} onClick={() => void post('text', q)}>{q}</button>)}</div>
      <form className="composer" onSubmit={send}>
        <textarea value={text} maxLength={500} rows={2} placeholder="Écrire à l’équipe…" onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e); } }} />
        <button className="primary" type="submit">Envoyer</button>
      </form>
      <form className="offer-form" onSubmit={offer}>
        <span>🎁 Proposer du surplus :</span>
        <input value={offerName} onChange={e => setOfferName(e.target.value)} placeholder="Ressource (ex. Blé)" maxLength={80} />
        <input value={offerQty} onChange={e => setOfferQty(e.target.value)} placeholder="Quantité (facultatif)" maxLength={10} />
        <button type="submit">Proposer</button>
      </form>
      <p className="meta small">Astuce : le bouton 📣 à côté d’une ressource que tu as déjà propose directement ton surplus à l’équipe.</p>
    </main>
  );
}
