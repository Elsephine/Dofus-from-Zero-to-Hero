// Codes cadeaux Dofus : partagés par l'équipe, pop-up quand un nouveau code arrive, « utilisé » coché par personnage.
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Gift as GiftIcon } from 'lucide-react';
import { addGift, deleteGift, isDone, listGifts, toggle, useProgress, type Gift } from './model/progress';
import { profiles } from './model/profiles';

export const CODES_URL = 'https://www.dofus.com/fr/mmorpg/communaute/codes';
export const giftId = (code: string) => 'gift:' + code.toUpperCase();

// Liste partagée entre la pop-up et la page Outils (rechargée toutes les 5 min et au retour sur l'onglet).
let gifts: Gift[] = []; let ver = 0; const subs = new Set<() => void>();
let loadedFor = -1; let timer: number | undefined;
async function refresh(p: number) { try { gifts = await listGifts(p); ver++; subs.forEach(f => f()); } catch { /* hors ligne */ } }
function useGifts(p: number) {
  useEffect(() => {
    if (loadedFor !== p) { loadedFor = p; void refresh(p); clearInterval(timer); timer = window.setInterval(() => refresh(p), 5 * 60_000); }
    const vis = () => { if (document.visibilityState === 'visible') void refresh(p); };
    document.addEventListener('visibilitychange', vis); return () => document.removeEventListener('visibilitychange', vis);
  }, [p]);
  useSyncExternalStore(f => { subs.add(f); return () => subs.delete(f); }, () => ver);
  return { gifts, reload: () => refresh(p) };
}

const SEEN = (p: number) => `fzth:v2:giftSeen:${p}`;
const readSeen = (p: number): string[] => { try { return JSON.parse(localStorage.getItem(SEEN(p)) ?? '[]'); } catch { return []; } };
const markSeen = (p: number, id: string) => { try { localStorage.setItem(SEEN(p), JSON.stringify([...new Set([...readSeen(p), id])])); } catch { /* ignore */ } };
const fmtDate = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });

async function copy(code: string) { try { await navigator.clipboard.writeText(code); return true; } catch { return false; } }

/** Pop-up : un code ajouté par un coéquipier, pas encore vu ni utilisé sur ce personnage. */
export function GiftPopup({ profileId }: { profileId: number }) {
  useProgress();
  const { gifts } = useGifts(profileId);
  const [, setTick] = useState(0); const [copied, setCopied] = useState(false);
  const seen = readSeen(profileId);
  const g = gifts.find(x => x.added_by !== profileId && !seen.includes(x.id) && !isDone(profileId, giftId(x.code)));
  if (!g) return null;
  const who = profiles.find(p => p.id === g.added_by);
  const close = () => { markSeen(profileId, g.id); setCopied(false); setTick(t => t + 1); };
  return (
    <div className="modal" onClick={close}>
      <div className="panel gift-pop" onClick={e => e.stopPropagation()}>
        <GiftIcon size={34} className="gift-ic" />
        <h2>Nouveau code cadeau !</h2>
        <button className="gift-code" onClick={async () => setCopied(await copy(g.code))} title="Copier le code">{g.code}</button>
        <p className="meta">{copied ? '✓ Code copié' : 'Touche le code pour le copier.'}</p>
        {g.reward && <p><strong>Récompense :</strong> {g.reward}</p>}
        {g.expires && <p className="warn">⏳ Valable jusqu’au {fmtDate(g.expires)}</p>}
        <p className="meta small">Ajouté par {who?.name ?? 'un coéquipier'}. À saisir en jeu (touche R) ou sur la page des codes cadeaux Ankama.</p>
        <div className="row gift-actions">
          <a className="link-button" href={CODES_URL} target="_blank" rel="noreferrer">Ouvrir la page des codes ↗</a>
          <button className="primary" onClick={() => { toggle(profileId, giftId(g.code), true); close(); }}>✓ Je l’ai utilisé</button>
          <button onClick={close}>Plus tard</button>
        </div>
      </div>
    </div>
  );
}

/** Bloc de la page Outils : liste des codes en cours + ajout. */
export function GiftCodes({ profileId }: { profileId: number }) {
  useProgress();
  const { gifts, reload } = useGifts(profileId);
  const [code, setCode] = useState(''); const [reward, setReward] = useState(''); const [exp, setExp] = useState('');
  const [msg, setMsg] = useState(''); const [copied, setCopied] = useState('');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg('');
    const c = code.trim().toUpperCase(); if (c.length < 3) return setMsg('Colle le code cadeau.');
    try { await addGift(profileId, c, reward.trim(), exp || null); markSeen(profileId, c); setCode(''); setReward(''); setExp(''); setMsg('✓ Code partagé : les autres le verront en pop-up.'); void reload(); }
    catch (err) { setMsg('Impossible : ' + (err as Error).message); }
  };
  return (
    <section className="toolbox gifts">
      <h3>🎁 Codes cadeaux</h3>
      <p className="meta">Un code trouvé (live, Twitch, réseaux…) ? Ajoute-le : les deux autres reçoivent une pop-up à leur prochaine ouverture du site.</p>
      {gifts.length ? <ul className="gift-list">{gifts.map(g => {
        const used = isDone(profileId, giftId(g.code));
        return (
          <li key={g.id} className={used ? 'done' : ''}>
            <label title="Je l’ai utilisé"><input type="checkbox" checked={used} onChange={() => toggle(profileId, giftId(g.code))} /></label>
            <button className="gift-code small" onClick={async () => { if (await copy(g.code)) { setCopied(g.id); setTimeout(() => setCopied(''), 1500); } }} title="Copier">{copied === g.id ? '✓ copié' : g.code}</button>
            <span>{g.reward || <em className="meta">récompense non précisée</em>}{g.expires && <small className="meta"> · jusqu’au {fmtDate(g.expires)}</small>}</span>
            <span className="who">{profiles.filter(p => isDone(p.id, giftId(g.code))).map(p => <img key={p.id} src={`${import.meta.env.BASE_URL}persos/${p.image}`} alt={p.name} title={`${p.name} l’a utilisé`} className="ok" />)}</span>
            {g.added_by === profileId && <button className="link-like" onClick={async () => { await deleteGift(profileId, g.id).catch(() => {}); void reload(); }} title="Retirer">✕</button>}
          </li>
        );
      })}</ul> : <p className="meta">Aucun code en cours.</p>}
      <form className="gift-form" onSubmit={submit}>
        <input value={code} onChange={e => setCode(e.target.value)} placeholder="Code (ex. DOFUSNOWEL2026)" autoCapitalize="characters" />
        <input value={reward} onChange={e => setReward(e.target.value)} placeholder="Récompense (facultatif)" />
        <label className="meta small">Expire le <input type="date" value={exp} onChange={e => setExp(e.target.value)} /></label>
        <button className="primary" type="submit">Partager le code</button>
      </form>
      {msg && <p className="meta small">{msg}</p>}
      <a className="link-button" href={CODES_URL} target="_blank" rel="noreferrer">Page des codes cadeaux Ankama ↗</a>
    </section>
  );
}
