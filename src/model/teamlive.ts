// Données d'équipe « en direct » : présence (qui a le site ouvert), disponibilités de la semaine, répartition de la récolte.
import { useSyncExternalStore } from 'react';
import { codeFor, rpc } from './progress';

export interface Presence { profile_id: number; page: string | null; last_seen: string }
export interface Avail { profile_id: number; slots: string[]; note: string | null; updated_at: string }
export interface Claim { item_id: string; profile_id: number; created_at: string }

let active: number | null = null;
let page = '';
let presence: Presence[] = [];
let avail: Avail[] = [];
let claims: Claim[] = [];
let online: boolean | null = null;
let version = 0;
const listeners = new Set<() => void>();
const emit = () => { version++; listeners.forEach(l => l()); };
const code = () => (active === null ? undefined : codeFor(active));

async function ping() {
  if (active === null || !code() || document.visibilityState !== 'visible') return;
  try { presence = (await rpc<Presence[]>('fzth_ping', { p_profile: active, p_code: code(), p_page: page })) ?? []; online = true; }
  catch { online = false; }
  emit();
}
async function loadClaims() {
  if (active === null || !code()) return;
  try { claims = (await rpc<Claim[]>('fzth_claim_list', { p_profile: active, p_code: code() })) ?? []; } catch { /* hors ligne */ }
  emit();
}
export async function loadAvail() {
  if (active === null || !code()) return;
  try { avail = (await rpc<Avail[]>('fzth_avail_list', { p_profile: active, p_code: code() })) ?? []; } catch { /* hors ligne */ }
  emit();
}

let timers: ReturnType<typeof setInterval>[] = [];
export function watchTeamLive(p: number | null) {
  if (active === p) return;
  active = p; presence = []; claims = []; avail = [];
  timers.forEach(clearInterval); timers = [];
  if (p === null) { emit(); return; }
  void ping(); void loadClaims(); void loadAvail();
  timers = [setInterval(() => void ping(), 30_000), setInterval(() => void loadClaims(), 20_000), setInterval(() => void loadAvail(), 60_000)];
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void ping(); });
}
/** Page affichée (« Dofus Cauchemar », « Métiers »…) : visible par les autres. */
export function setPresencePage(label: string) { if (label !== page) { page = label; void ping(); } }

export async function setClaim(itemId: string, claim: boolean) {
  if (active === null) return;
  // Affichage immédiat, puis confirmation par le serveur.
  claims = claim ? [...claims.filter(c => c.item_id !== itemId), { item_id: itemId, profile_id: active, created_at: new Date().toISOString() }] : claims.filter(c => !(c.item_id === itemId && c.profile_id === active));
  emit();
  try { await rpc('fzth_claim_set', { p_profile: active, p_code: code(), p_item: itemId, p_claim: claim }); } catch { /* hors ligne */ }
  await loadClaims();
}

let availTimer: ReturnType<typeof setTimeout> | null = null;
export function setMyAvail(slots: string[], note: string | null) {
  if (active === null) return;
  const me = active;
  avail = [...avail.filter(a => a.profile_id !== me), { profile_id: me, slots, note, updated_at: new Date().toISOString() }];
  emit();
  if (availTimer) clearTimeout(availTimer);
  availTimer = setTimeout(() => { void rpc('fzth_avail_set', { p_profile: me, p_code: code(), p_slots: slots, p_note: note }).catch(() => undefined); }, 700);
}

export const ONLINE_MS = 90_000;
export function useTeamLive() {
  useSyncExternalStore(cb => { listeners.add(cb); return () => listeners.delete(cb); }, () => version);
  const now = Date.now();
  const isOnline = (pid: number) => presence.some(x => x.profile_id === pid && now - Date.parse(x.last_seen) < ONLINE_MS);
  const pageOf = (pid: number) => presence.find(x => x.profile_id === pid)?.page ?? null;
  const lastSeen = (pid: number) => presence.find(x => x.profile_id === pid)?.last_seen ?? null;
  const claimOf = (itemId: string) => claims.find(c => c.item_id === itemId)?.profile_id;
  return { presence, avail, claims, online, isOnline, pageOf, lastSeen, claimOf };
}
