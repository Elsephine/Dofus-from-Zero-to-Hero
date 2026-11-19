// Notifications d'équipe : quand un autre personnage enregistre un stuff DofusBook, les autres le voient
// (cloche dans l'en-tête + message éphémère, et notification du navigateur si elle a été autorisée).
import { useSyncExternalStore } from 'react';
import { codeFor, isDone, listDone, rpc, teamInfo } from './progress';
import { labelOf } from './search';
import { profiles } from './profiles';
import type { Stuff } from './stuffs';

export interface Notif { id: string; text: string; url?: string; who: number; at: string; kind: 'stuff' | 'res' | 'msg' }
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
  if (newOnes.length) {
    toasts = [...toasts, ...newOnes];
    for (const n of newOnes) setTimeout(() => { toasts = toasts.filter(t => t.id !== n.id); emit(); }, 8000);
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
      for (const n of newOnes) try { new Notification('From Zero to Hero', { body: n.text }); } catch { /* ignore */ }
    }
  }
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
  toasts = [...toasts, ...ns];
  for (const n of ns) setTimeout(() => { toasts = toasts.filter(t => t.id !== n.id); emit(); }, 8000);
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
    for (const n of ns) try { new Notification('From Zero to Hero', { body: n.text }); } catch { /* ignore */ }
  }
  emit();
}
export const dismissToast = (id: string) => { toasts = toasts.filter(t => t.id !== id); emit(); };
export async function enableBrowserNotifications() {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.requestPermission();
}
export function useNotifications() {
  useSyncExternalStore(cb => { listeners.add(cb); return () => listeners.delete(cb); }, () => version);
  return { unseen, toasts, permission: typeof Notification === 'undefined' ? 'unsupported' : Notification.permission };
}
