// Notifications d'équipe : quand un autre personnage enregistre un stuff DofusBook, les autres le voient
// (cloche dans l'en-tête + message éphémère, et notification du navigateur si elle a été autorisée).
import { useSyncExternalStore } from 'react';
import { codeFor, rpc } from './progress';
import { profiles } from './profiles';
import type { Stuff } from './stuffs';

export interface Notif { id: string; text: string; url: string; who: number; at: string }
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
    .map(s => ({ id: s.id, url: s.url, who: s.profile_id, at: s.created_at, text: `${profiles.find(x => x.id === s.profile_id)?.name ?? 'Quelqu’un'} a ajouté un stuff : ${s.name}` }));
  const newOnes = fresh.filter(f => !unseen.some(u => u.id === f.id));
  unseen = fresh;
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
  const last = unseen.reduce((m, n) => (n.at > m ? n.at : m), getSeen(active) ?? '');
  if (last) setSeen(active, last);
  unseen = []; emit();
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
