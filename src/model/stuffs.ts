// Bibliothèque de stuffs DofusBook, partagée entre les 3 personnages (Supabase), avec copie sur l'appareil.
// Hors ligne : les ajouts restent sur l'appareil (local: true) et sont envoyés à la prochaine connexion.
import { useEffect, useState } from 'react';
import { codeFor, rpc } from './progress';
import { refreshNotifications } from './notifications';

export interface Stuff { id: string; profile_id: number; name: string; url: string; created_at: string; items?: Record<string, number>; local?: boolean }
const LS = 'fzth:v2:stuffs';
const read = (): Stuff[] => { try { return JSON.parse(localStorage.getItem(LS) ?? '[]'); } catch { return []; } };
const write = (l: Stuff[]) => { try { localStorage.setItem(LS, JSON.stringify(l)); } catch { /* ignore */ } };

export function useStuffs(profileId: number) {
  const [list, setList] = useState<Stuff[]>(read);
  const [online, setOnline] = useState<boolean | null>(null);
  const set = (l: Stuff[]) => { setList(l); write(l); };

  const refresh = async () => {
    const code = codeFor(profileId); if (!code) return;
    try {
      // Envoie d'abord ce qui a été ajouté hors ligne.
      for (const s of read().filter(x => x.local)) await rpc('fzth_stuff_add', { p_profile: profileId, p_code: code, p_name: s.name, p_url: s.url });
      const rows = await rpc<Stuff[]>('fzth_stuff_list', { p_profile: profileId, p_code: code });
      set(rows ?? []); setOnline(true); refreshNotifications();
    } catch { setOnline(false); }
  };
  useEffect(() => { void refresh(); }, [profileId]); // eslint-disable-line react-hooks/exhaustive-deps

  const add = async (name: string, url: string) => {
    const code = codeFor(profileId);
    try {
      await rpc('fzth_stuff_add', { p_profile: profileId, p_code: code, p_name: name, p_url: url });
      await refresh();
    } catch {
      set([{ id: 'local-' + Date.now(), profile_id: profileId, name, url, created_at: new Date().toISOString(), local: true }, ...list]); setOnline(false);
    }
  };
  const remove = async (s: Stuff) => {
    if (s.local) { set(list.filter(x => x.id !== s.id)); return; }
    try { await rpc('fzth_stuff_delete', { p_profile: profileId, p_code: codeFor(profileId), p_id: s.id }); await refresh(); }
    catch { setOnline(false); }
  };
  /** Enregistre les objets choisis case par case (partagés avec l'équipe). */
  const setItems = async (s: Stuff, items: Record<string, number>) => {
    set(list.map(x => x.id === s.id ? { ...x, items } : x));
    if (s.local) return;
    try { await rpc('fzth_stuff_items', { p_profile: profileId, p_code: codeFor(profileId), p_id: s.id, p_items: items }); }
    catch { setOnline(false); }
  };
  return { list, online, add, remove, setItems };
}
