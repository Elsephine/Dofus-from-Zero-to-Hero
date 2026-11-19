// Progression des personnages : une entrée par (personnage, objectif).
// - Chaque personnage est protégé par son propre code, choisi par son joueur à la première connexion.
// - Toujours enregistrée tout de suite dans le navigateur (fonctionne hors ligne).
// - Envoyée à Supabase objectif par objectif ; en cas de conflit, la modification la plus récente d'un objectif gagne.
import { useSyncExternalStore } from 'react';
import { cloud } from '../config';

export interface Entry { done: boolean; at: string }
export type SyncStatus = 'local' | 'syncing' | 'ok' | 'offline' | 'badcode';

const LS_DATA = 'fzth:v2:progress';
const LS_CODES = 'fzth:v2:codes';        // codes des personnages déverrouillés sur cet appareil
const LS_HASHES = 'fzth:v2:codeHashes';  // empreintes, pour vérifier le code quand le serveur est injoignable
const POLL_MS = 10_000;
const key = (p: number, id: string) => `${p}|${id}`;

let entries = new Map<string, Entry>();
let pending = new Set<string>();
let codes: Record<string, string> = {};
let hashes: Record<string, string> = {};
let status: SyncStatus = 'local';
let lastSync: Date | null = null;
let version = 0;
const listeners = new Set<() => void>();

const readLS = <T,>(k: string, def: T): T => { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : def; } catch { return def; } };
const writeLS = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* stockage indisponible */ } };

function emit() { version++; listeners.forEach(l => l()); }
function save() { writeLS(LS_DATA, { entries: [...entries], pending: [...pending] }); }
function load() {
  const d = readLS<{ entries?: [string, Entry][]; pending?: string[] }>(LS_DATA, {});
  entries = new Map(d.entries ?? []); pending = new Set(d.pending ?? []);
  codes = readLS(LS_CODES, {}); hashes = readLS(LS_HASHES, {});
}

async function sha(p: number, code: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${p}:${code}`));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export class RpcError extends Error { constructor(msg: string, public network = false) { super(msg); } }
export async function rpc<T>(fn: string, body: object): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${cloud.url}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      // Clé « sb_publishable_ » : l'en-tête apikey suffit ; l'ancien format (JWT « eyJ… ») demande aussi Authorization.
      headers: { apikey: cloud.anonKey, ...(cloud.anonKey.startsWith('eyJ') ? { Authorization: `Bearer ${cloud.anonKey}` } : {}), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch { throw new RpcError('réseau', true); }
  const txt = await res.text();
  if (!res.ok) {
    if (/code invalide/.test(txt)) throw new RpcError('code invalide');
    if (/code trop court/.test(txt)) throw new RpcError('code trop court');
    throw new RpcError(txt || `HTTP ${res.status}`, res.status >= 500 || res.status === 404);
  }
  return (txt ? JSON.parse(txt) : null) as T;
}

// ---------- Codes des personnages ----------
export const isUnlocked = (p: number) => !!codes[p];
export const codeFor = (p: number) => codes[p];

/** true si le personnage a déjà un code (serveur, sinon ce navigateur) ; null si on ne sait pas. */
export async function hasCode(p: number): Promise<boolean | null> {
  try { return await rpc<boolean>('fzth_status', { p_profile: p }); }
  catch { return hashes[p] ? true : null; }
}

export async function login(p: number, code: string): Promise<{ ok: true; created: boolean; offline?: boolean } | { ok: false; error: string }> {
  code = code.trim();
  if (code.length < 4) return { ok: false, error: 'Le code doit faire au moins 4 caractères.' };
  const h = await sha(p, code);
  try {
    const r = await rpc<string>('fzth_login', { p_profile: p, p_code: code });
    codes[p] = code; hashes[p] = h; writeLS(LS_CODES, codes); writeLS(LS_HASHES, hashes); emit(); void sync();
    return { ok: true, created: r === 'created' };
  } catch (e) {
    const err = e as RpcError;
    if (!err.network) return { ok: false, error: err.message === 'code invalide' ? 'Code incorrect.' : err.message === 'code trop court' ? 'Le code doit faire au moins 4 caractères.' : 'Erreur du serveur : ' + err.message };
    // Serveur injoignable : on vérifie avec l'empreinte gardée sur cet appareil (ou on la crée).
    if (hashes[p] && hashes[p] !== h) return { ok: false, error: 'Code incorrect.' };
    const created = !hashes[p];
    codes[p] = code; hashes[p] = h; writeLS(LS_CODES, codes); writeLS(LS_HASHES, hashes); emit();
    return { ok: true, created, offline: true };
  }
}

export function logout(p: number) { delete codes[p]; writeLS(LS_CODES, codes); emit(); }

// ---------- Synchronisation ----------
let running: Promise<void> | null = null;
export function sync(): Promise<void> {
  if (!running) running = doSync().finally(() => { running = null; });
  return running;
}

async function doSync() {
  const profiles = Object.keys(codes).map(Number);
  if (!cloud.url || !cloud.anonKey || !profiles.length) { status = 'local'; emit(); return; }
  if (status !== 'ok') { status = 'syncing'; emit(); }
  let failed: SyncStatus | null = null;
  for (const p of profiles) {
    const code = codes[p];
    try {
      const items: { id: string; done: boolean; at: string }[] = []; const sent = new Map<string, string>();
      for (const k of pending) {
        if (!k.startsWith(p + '|')) continue;
        const e = entries.get(k); if (!e) continue;
        items.push({ id: k.slice(k.indexOf('|') + 1), done: e.done, at: e.at }); sent.set(k, e.at);
      }
      if (items.length) await rpc('fzth_set', { p_profile: p, p_code: code, p_items: items });
      for (const [k, at] of sent) if (entries.get(k)?.at === at) pending.delete(k); // pas re-modifié pendant l'envoi
      const rows = await rpc<{ profile_id: number; item_id: string; done: boolean; updated_at: string }[]>('fzth_get', { p_profile: p, p_code: code });
      for (const r of rows ?? []) {
        const k = key(r.profile_id, r.item_id);
        if (pending.has(k)) continue;
        const local = entries.get(k);
        if (!local || Date.parse(r.updated_at) >= Date.parse(local.at)) entries.set(k, { done: r.done, at: r.updated_at });
      }
    } catch (e) {
      if ((e as RpcError).message === 'code invalide') { delete codes[p]; writeLS(LS_CODES, codes); failed = 'badcode'; } // code changé ailleurs
      else failed = failed ?? 'offline';
    }
  }
  status = failed ?? 'ok';
  if (!failed) lastSync = new Date();
  save(); emit();
}

export function toggle(profile: number, id: string, done?: boolean) {
  const k = key(profile, id);
  const cur = entries.get(k);
  const next = done ?? !cur?.done;
  if (done !== undefined && cur && cur.done === next) return; // déjà dans cet état
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
