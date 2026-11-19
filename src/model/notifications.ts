// Notifications d'équipe : quand un autre personnage enregistre un stuff DofusBook, les autres le voient
// (cloche dans l'en-tête + message éphémère, et notification du navigateur si elle a été autorisée).
import { useSyncExternalStore } from 'react';
import { codeFor, isDone, listDone, rpc, teamInfo } from './progress';
import { labelOf } from './search';
import { profiles } from './profiles';
import type { Stuff } from './stuffs';

export interface Notif { id: string; text: string; url?: string; who: number; at: string; kind: 'stuff' | 'res' | 'msg'; cat?: Cat }

/** Catégories : on regroupe les bulles par catégorie et chacune peut être mise en sourdine. */
export type Cat = 'chat' | 'trade' | 'news' | 'stuff';
export const CATS: { id: Cat; icon: string; label: string; plural: string }[] = [
  { id: 'chat', icon: '💬', label: 'Discussion', plural: 'nouveaux messages' },
  { id: 'trade', icon: '🎁', label: 'Échanges & ressources', plural: 'nouveautés' },
  { id: 'news', icon: '🎉', label: 'Annonces', plural: 'annonces' },
  { id: 'stuff', icon: '🛡️', label: 'Stuffs', plural: 'nouveaux stuffs' },
];
export const catOf = (n: Notif): Cat => n.cat ?? (n.kind === 'stuff' ? 'stuff' : n.kind === 'res' ? 'trade' : 'chat');
const MUTE = 'fzth:v2:notifMute';
let muted: Cat[] = (() => { try { return JSON.parse(localStorage.getItem(MUTE) ?? '[]'); } catch { return []; } })();
export const isMuted = (c: Cat) => muted.includes(c);
export function setMuted(c: Cat, on: boolean) {
  muted = on ? [...new Set([...muted, c])] : muted.filter(x => x !== c);
  try { localStorage.setItem(MUTE, JSON.stringify(muted)); } catch { /* ignore */ }
  toasts = toasts.filter(t => !muted.includes(catOf(t))); emit();
}

/** Ajoute des bulles (sauf catégories en sourdine) et envoie une seule notification navigateur par catégorie. */
function addToasts(ns: Notif[]) {
  const shown = ns.filter(n => !isMuted(catOf(n)));
  if (!shown.length) return;
  toasts = [...toasts, ...shown];
  for (const n of shown) setTimeout(() => { toasts = toasts.filter(t => t.id !== n.id); emit(); }, 10_000);
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
    for (const c of CATS) {
      const g = shown.filter(n => catOf(n) === c.id); if (!g.length) continue;
      try { new Notification(`${c.icon} ${c.label}`, { body: g.length === 1 ? g[0].text : `${g.length} ${c.plural} · ${g.reduce((a, b) => (b.at > a.at ? b : a)).text}`, tag: 'fzth-' + c.id }); } catch { /* ignore */ }
    }
  }
}
const POLL_MS = 30_000;
const seenKey = (p: number) => `fzth:v2:stuffSeen:${p}`;

let active: number | null = null;
let unseen: Notif[] = [];
let toasts: Notif[] = [];
let version = 0;
const listeners = new Set<() => void>();
const emit = () => { version++; listeners.forEach(l => l()); };

const getSeen = (p: number) => { try { return localStorage.getItem(seenKey(p)); } catch { return null; } };
const setSeen = (p: number, at: string) => { try { localStorage.setItem(seenKey(p), at); } catch { /* ignore */ } };

async function poll() {
  const p = active; if (p === null) return;
  const code = codeFor(p); if (!code) return;
  let rows: Stuff[];
  try { rows = (await rpc<Stuff[]>('fzth_stuff_list', { p_profile: p, p_code: code })) ?? []; } catch { return; }
  if (p !== active) return;
  const seen = getSeen(p);
  if (!seen) { setSeen(p, new Date().toISOString()); return; } // première fois : on ne remonte pas tout l'historique
  const fresh = rows.filter(s => s.profile_id !== p && s.created_at > seen)
    .map(s => ({ id: s.id, kind: 'stuff' as const, url: s.url, who: s.profile_id, at: s.created_at, text: `${profiles.find(x => x.id === s.profile_id)?.name ?? 'Quelqu’un'} a ajouté un stuff : ${s.name}` }));
  // Ressources : un autre personnage (qui partage sa progression) a coché une ressource que je n'ai pas encore.
  const resKey = `fzth:v2:resSeen:${p}`;
  const { team } = teamInfo();
  const now = new Set<string>();
  for (const o of profiles) if (o.id !== p && team[o.id]) for (const k of [...listDone(o.id, 'res:'), ...listDone(o.id, 'job:')]) now.add(`${o.id}|${k}`);
  let prevRes: string[] | null = null; try { prevRes = JSON.parse(localStorage.getItem(resKey) ?? 'null'); } catch { /* ignore */ }
  const resNotifs: Notif[] = [];
  if (prevRes) {
    const prevSet = new Set(prevRes);
    for (const x of now) {
      if (prevSet.has(x)) continue;
      const [who, k] = [Number(x.split('|')[0]), x.slice(x.indexOf('|') + 1)];
      if (isDone(p, k)) continue; // je l'ai déjà moi-même
      resNotifs.push({ id: 'res-' + x, kind: 'res', who, at: new Date().toISOString(), text: `${profiles.find(o => o.id === who)?.name} a déjà tout pour : ${labelOf(k).replace(/^Ressource (métier )?/, '')}` });
    }
  }
  try { localStorage.setItem(resKey, JSON.stringify([...now])); } catch { /* ignore */ }
  const keptRes = unseen.filter(u => u.kind === 'res');
  const allNew = [...fresh, ...keptRes, ...resNotifs.filter(r => !keptRes.some(k => k.id === r.id))];
  const newOnes = [...fresh.filter(f => !unseen.some(u => u.id === f.id)), ...resNotifs];
  unseen = allNew;
  addToasts(newOnes);
  emit();
}

let timer: ReturnType<typeof setInterval> | null = null;
export function watchNotifications(profileId: number | null) {
  if (active === profileId) return;
  active = profileId; unseen = []; toasts = []; emit();
  if (timer) clearInterval(timer);
  if (profileId !== null) { void poll(); timer = setInterval(() => void poll(), POLL_MS); }
}
export const refreshNotifications = () => void poll();
export function markAllSeen() {
  if (active === null) return;
  const last = unseen.filter(n => n.kind === 'stuff').reduce((m, n) => (n.at > m ? n.at : m), getSeen(active) ?? '');
  if (last) setSeen(active, last);
  unseen = []; emit();
}
/** Messages éphémères venant d'ailleurs (messagerie). */
export function pushToasts(ns: Notif[]) {
  addToasts(ns);
  emit();
}
export const dismissToast = (id: string) => { toasts = toasts.filter(t => t.id !== id); emit(); };
export const dismissCat = (c: Cat) => { toasts = toasts.filter(t => catOf(t) !== c); emit(); };
export async function enableBrowserNotifications() {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.requestPermission();
}
export function useNotifications() {
  useSyncExternalStore(cb => { listeners.add(cb); return () => listeners.delete(cb); }, () => version);
  return { unseen, toasts, permission: typeof Notification === 'undefined' ? 'unsupported' : Notification.permission };
}
