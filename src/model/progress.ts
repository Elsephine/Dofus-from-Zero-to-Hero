// Progression des 3 personnages : une entrée par (personnage, objectif).
// - Toujours enregistrée tout de suite dans le navigateur (fonctionne hors ligne).
// - Envoyée à Supabase objectif par objectif (plus d'écrasement de tout le personnage).
// - En cas de conflit, la modification la plus récente d'un objectif gagne ; les autres objectifs ne sont jamais touchés.
import { useSyncExternalStore } from 'react';
import { cloud } from '../config';

export interface Entry { done: boolean; at: string }
export type SyncStatus = 'local' | 'syncing' | 'ok' | 'offline' | 'badcode';

const LS_DATA = 'fzth:v2:progress';
const LS_CODE = 'fzth:v2:teamCode';
const POLL_MS = 10_000;
const key = (p: number, id: string) => `${p}|${id}`;

let entries = new Map<string, Entry>();
let pending = new Set<string>();
let status: SyncStatus = 'local';
let lastSync: Date | null = null;
let version = 0;
const listeners = new Set<() => void>();

function emit() { version++; listeners.forEach(l => l()); }
function save() {
  try { localStorage.setItem(LS_DATA, JSON.stringify({ entries: [...entries], pending: [...pending] })); } catch { /* stockage indisponible */ }
}
function load() {
  try {
    const raw = localStorage.getItem(LS_DATA);
    if (!raw) return;
    const d = JSON.parse(raw);
    entries = new Map(d.entries ?? []);
    pending = new Set(d.pending ?? []);
  } catch { /* données locales illisibles : on repart de zéro */ }
}

export function getTeamCode() { try { return localStorage.getItem(LS_CODE) ?? ''; } catch { return ''; } }
export function setTeamCode(code: string) {
  try { code ? localStorage.setItem(LS_CODE, code.trim()) : localStorage.removeItem(LS_CODE); } catch { /* ignore */ }
  void sync();
}

async function rpc<T>(fn: string, body: object): Promise<T> {
  const res = await fetch(`${cloud.url}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    // Clé « sb_publishable_ » : l'en-tête apikey suffit ; l'ancien format (JWT « eyJ… ») demande aussi Authorization.
    headers: { apikey: cloud.anonKey, ...(cloud.anonKey.startsWith('eyJ') ? { Authorization: `Bearer ${cloud.anonKey}` } : {}), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    const err = new Error(txt) as Error & { badCode?: boolean };
    err.badCode = /code d'équipe invalide/.test(txt);
    throw err;
  }
  const txt = await res.text();
  return (txt ? JSON.parse(txt) : null) as T;
}

let running: Promise<void> | null = null;
export function sync(): Promise<void> {
  if (!running) running = doSync().finally(() => { running = null; });
  return running;
}

async function doSync() {
  const code = getTeamCode();
  if (!cloud.url || !cloud.anonKey || !code) { status = 'local'; emit(); return; }
  if (status !== 'ok') { status = 'syncing'; emit(); }
  try {
    // 1) Envoi de ce qui a changé ici, groupé par personnage.
    const sent = new Map<string, string>(); // clé -> date envoyée
    const byProfile = new Map<number, { id: string; done: boolean; at: string }[]>();
    for (const k of pending) {
      const e = entries.get(k); if (!e) continue;
      const [p, id] = [Number(k.split('|')[0]), k.slice(k.indexOf('|') + 1)];
      if (!byProfile.has(p)) byProfile.set(p, []);
      byProfile.get(p)!.push({ id, done: e.done, at: e.at });
      sent.set(k, e.at);
    }
    for (const [p, items] of byProfile) await rpc('fzth_set', { p_code: code, p_profile: p, p_items: items });
    for (const [k, at] of sent) if (entries.get(k)?.at === at) pending.delete(k); // pas re-modifié pendant l'envoi

    // 2) Récupération de l'équipe ; on ne remplace que ce qui est plus récent et pas en attente d'envoi.
    const rows = await rpc<{ profile_id: number; item_id: string; done: boolean; updated_at: string }[]>('fzth_get', { p_code: code });
    for (const r of rows ?? []) {
      const k = key(r.profile_id, r.item_id);
      if (pending.has(k)) continue;
      const local = entries.get(k);
      if (!local || Date.parse(r.updated_at) >= Date.parse(local.at)) entries.set(k, { done: r.done, at: r.updated_at });
    }
    status = 'ok'; lastSync = new Date();
  } catch (e) {
    status = (e as { badCode?: boolean }).badCode ? 'badcode' : 'offline';
  }
  save(); emit();
}

export function toggle(profile: number, id: string, done?: boolean) {
  const k = key(profile, id);
  const next = done ?? !entries.get(k)?.done;
  entries.set(k, { done: next, at: new Date().toISOString() });
  pending.add(k);
  save(); emit();
  void sync();
}

export function isDone(profile: number, id: string) { return !!entries.get(key(profile, id))?.done; }

export function useProgress() {
  const v = useSyncExternalStore(cb => { listeners.add(cb); return () => listeners.delete(cb); }, () => version);
  return { version: v, status, lastSync, pendingCount: pending.size, isDone };
}

// Démarrage : données locales, puis synchro régulière + au retour sur l'onglet / du réseau.
load();
if (typeof window !== 'undefined') {
  void sync();
  setInterval(() => { if (document.visibilityState === 'visible') void sync(); }, POLL_MS);
  window.addEventListener('focus', () => void sync());
  window.addEventListener('online', () => void sync());
}
