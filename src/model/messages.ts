// Messagerie d'équipe : messages libres, offres de ressources en surplus (« Je prends »), annonces automatiques.
// Lecture toutes les 15 s ; les nouveaux messages des autres passent aussi par la cloche et les messages éphémères.
import { useSyncExternalStore } from 'react';
import { codeFor, rpc } from './progress';

export type MsgKind = 'text' | 'offer' | 'take' | 'done';
export interface Message { id: string; profile_id: number; kind: MsgKind; body: string; ref: string | null; created_at: string; local?: boolean }

const POLL_MS = 15_000;
const LS = 'fzth:v2:messages';
const readKey = (p: number) => `fzth:v2:msgRead:${p}`;
let active: number | null = null;
let list: Message[] = (() => { try { return JSON.parse(localStorage.getItem(LS) ?? '[]'); } catch { return []; } })();
let online: boolean | null = null;
let version = 0;
const listeners = new Set<() => void>();
const newListeners = new Set<(m: Message[]) => void>();
const emit = () => { version++; listeners.forEach(l => l()); };
const save = () => { try { localStorage.setItem(LS, JSON.stringify(list.slice(0, 200))); } catch { /* ignore */ } };

export const lastRead = (p: number) => { try { return localStorage.getItem(readKey(p)) ?? ''; } catch { return ''; } };
export function markRead(p: number) {
  const last = list.find(m => !m.local)?.created_at; if (!last) return;
  try { localStorage.setItem(readKey(p), last); } catch { /* ignore */ } emit();
}
export const onNewMessages = (cb: (m: Message[]) => void) => { newListeners.add(cb); return () => newListeners.delete(cb); };

async function poll() {
  const p = active; if (p === null) return;
  const code = codeFor(p); if (!code) return;
  try {
    // Envoie d'abord ce qui a été écrit hors ligne.
    for (const m of list.filter(x => x.local && x.profile_id === p).reverse()) {
      await rpc('fzth_msg_post', { p_profile: p, p_code: code, p_kind: m.kind, p_body: m.body, p_ref: m.ref });
      list = list.filter(x => x.id !== m.id); save();
    }
    const rows = (await rpc<Message[]>('fzth_msg_list', { p_profile: p, p_code: code })) ?? [];
    if (p !== active) return;
    const known = new Set(list.map(m => m.id));
    const fresh = rows.filter(m => !known.has(m.id) && m.profile_id !== p);
    const firstLoad = !lastRead(p);
    list = rows; online = true; save();
    if (firstLoad && rows[0]) { try { localStorage.setItem(readKey(p), rows[0].created_at); } catch { /* ignore */ } }
    else if (fresh.length) newListeners.forEach(cb => cb(fresh));
  } catch { online = false; }
  emit();
}

let timer: ReturnType<typeof setInterval> | null = null;
export function watchMessages(p: number | null) {
  if (active === p) return;
  active = p;
  if (timer) clearInterval(timer);
  if (p !== null) { void poll(); timer = setInterval(() => void poll(), POLL_MS); }
  emit();
}

export async function post(kind: MsgKind, body: string, ref: string | null = null) {
  const p = active; if (p === null || !body.trim()) return;
  const m: Message = { id: 'local-' + Date.now() + Math.random(), profile_id: p, kind, body: body.trim().slice(0, 500), ref, created_at: new Date().toISOString(), local: true };
  list = [m, ...list]; save(); emit();
  await poll(); // envoie tout de suite (ou garde pour plus tard si hors ligne)
}

export function useMessages() {
  useSyncExternalStore(cb => { listeners.add(cb); return () => listeners.delete(cb); }, () => version);
  const p = active;
  const read = p === null ? '' : lastRead(p);
  const unread = p === null ? 0 : list.filter(m => !m.local && m.profile_id !== p && m.created_at > read).length;
  return { list, online, unread };
}
