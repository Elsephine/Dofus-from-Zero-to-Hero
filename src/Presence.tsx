// En-tête : coéquipiers qui ont le site ouvert en ce moment (petit fichier, chargé tout de suite).
import { profiles } from './model/profiles';
import { useTeamLive } from './model/teamlive';

const avatar = (img: string) => `${import.meta.env.BASE_URL}persos/${img}`;

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
