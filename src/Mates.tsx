import { useState } from 'react';
import { post } from './model/messages';
import { profiles } from './model/profiles';
import { teamInfo } from './model/progress';

// Petits médaillons des coéquipiers (qui partagent leur progression) ayant déjà coché cet objectif / cette ressource.
export function Mates({ id, profileId, isDone }: { id: string; profileId: number; isDone: (p: number, id: string) => boolean }) {
  const { team } = teamInfo();
  const who = profiles.filter(p => p.id !== profileId && team[p.id] && isDone(p.id, id));
  if (!who.length) return null;
  return (
    <span className="mates" title={`${who.map(w => w.name).join(' et ')} ${who.length > 1 ? 'ont' : 'a'} déjà tout : demande-leur si besoin`}>
      {who.map(w => <img key={w.id} src={`${import.meta.env.BASE_URL}persos/${w.image}`} alt={w.name} />)}
    </span>
  );
}


/** Bouton 📣 : propose son surplus d'une ressource à l'équipe (message « X propose de donner du Blé supplémentaire »). */
export function OfferButton({ name, profileId }: { name: string; profileId: number }) {
  const [sent, setSent] = useState(false);
  const me = profiles.find(p => p.id === profileId)!;
  return (
    <button type="button" className="offer-btn" disabled={sent} title="Proposer mon surplus à l’équipe"
      onClick={e => { e.preventDefault(); e.stopPropagation(); void post('offer', `${me.name} propose de donner du ${name} supplémentaire`, name); setSent(true); }}>
      {sent ? '✓' : '📣'}
    </button>
  );
}
