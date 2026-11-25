// Progression des personnages : une entrée par (personnage, objectif).
// - Chaque personnage est protégé par son propre code, choisi par son joueur à la première connexion.
// - Toujours enregistrée tout de suite dans le navigateur (fonctionne hors ligne).
// - Envoyée à Supabase objectif par objectif ; en cas de conflit, la modification la plus récente d'un objectif gagne.
import { useSyncExternalStore } from 'react';
import { cloud } from '../config';

export interface Entry { done: boolean; at: string; qty?: number }
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
let team: Record<number, boolean> = {}; // qui partage sa progression (serveur)
let teamLoaded = false;
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
    let msg = txt; try { msg = JSON.parse(txt).message ?? txt; } catch { /* texte brut */ }
    throw new RpcError(msg || `HTTP ${res.status}`, res.status >= 500 || res.status === 404);
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
      const items: { id: string; done: boolean; at: string; qty?: number }[] = []; const sent = new Map<string, string>();
      for (const k of pending) {
        if (!k.startsWith(p + '|')) continue;
        const e = entries.get(k); if (!e) continue;
        items.push({ id: k.slice(k.indexOf('|') + 1), done: e.done, at: e.at, ...(e.qty !== undefined ? { qty: e.qty } : {}) }); sent.set(k, e.at);
      }
      if (items.length) await rpc('fzth_set', { p_profile: p, p_code: code, p_items: items });
      for (const [k, at] of sent) if (entries.get(k)?.at === at) pending.delete(k); // pas re-modifié pendant l'envoi
      const rows = await rpc<{ profile_id: number; item_id: string; done: boolean; updated_at: string; qty?: number | null }[]>('fzth_get_all', { p_profile: p, p_code: code });
      for (const r of rows ?? []) {
        const k = key(r.profile_id, r.item_id);
        if (pending.has(k)) continue;
        const local = entries.get(k);
        if (!local || Date.parse(r.updated_at) >= Date.parse(local.at)) entries.set(k, { done: r.done, at: new Date(r.updated_at).toISOString(), ...(r.qty != null ? { qty: r.qty } : {}) });
      }
      // Équipe : qui partage, et la progression des autres (lecture seule, jamais renvoyée au serveur).
      const st = await rpc<{ profile_id: number; shared: boolean }[]>('fzth_team_status', { p_profile: p, p_code: code });
      team = Object.fromEntries((st ?? []).map(r => [r.profile_id, r.shared])); teamLoaded = true;
      for (const k of [...entries.keys()]) { const op = Number(k.split('|')[0]); if (!codes[op] && !team[op]) entries.delete(k); } // partage retiré
      const others = await rpc<{ profile_id: number; item_id: string; done: boolean; updated_at: string; qty?: number | null }[]>('fzth_team_get_all', { p_profile: p, p_code: code });
      for (const r of others ?? []) {
        if (codes[r.profile_id]) continue; // personnage aussi déverrouillé ici : on garde sa propre synchro
        entries.set(key(r.profile_id, r.item_id), { done: r.done, at: new Date(r.updated_at).toISOString(), ...(r.qty != null ? { qty: r.qty } : {}) });
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

// Journal des dernières actions (sur cet appareil), pour revoir et annuler une coche faite par erreur.
export interface HistoryEntry { at: string; profile: number; id: string; done: boolean; prev: boolean }
const LS_HISTORY = 'fzth:v2:history';
let history: HistoryEntry[] = readLS(LS_HISTORY, []);
export const getHistory = (profile: number) => history.filter(h => h.profile === profile);

/** Identifiants équivalents (même quête à deux endroits, ex. Alignement et Dofus Ivoire) : cochés/décochés ensemble. */
const links = new Map<string, string[]>();
export function linkIds(ids: string[]) {
  const all = [...new Set(ids.flatMap(i => links.get(i) ?? [i]))]; if (all.length < 2) return;
  for (const i of all) links.set(i, all);
}
const doneRaw = (profile: number, id: string) => !!entries.get(key(profile, id))?.done;

export function toggle(profile: number, id: string, done?: boolean, opts: { silent?: boolean } = {}) {
  const k = key(profile, id);
  const cur = entries.get(k);
  const was = isDone(profile, id);
  const next = done ?? !was;
  if (done !== undefined && was === next && (cur?.done ?? false) === next) return; // déjà dans cet état
  const at = new Date().toISOString();
  for (const other of links.get(id) ?? [id]) {
    const ok = key(profile, other); const c = entries.get(ok);
    if (other !== id && (c?.done ?? false) === next) continue;
    entries.set(ok, { done: next, at, ...(c?.qty !== undefined ? { qty: c.qty } : {}) });
    pending.add(ok);
  }
  if (!opts.silent && !id.startsWith('choice:')) {
    history = [{ at, profile, id, done: next, prev: was }, ...history].slice(0, 150);
    writeLS(LS_HISTORY, history);
  }
  save(); emit();
  void sync();
}

/** Annule une action du journal : remet l'objectif dans l'état d'avant et retire la ligne. */
export function undo(h: HistoryEntry) {
  toggle(h.profile, h.id, h.prev, { silent: true });
  history = history.filter(x => x !== h && !(x.at === h.at && x.id === h.id && x.profile === h.profile));
  writeLS(LS_HISTORY, history); emit();
}

export async function setShare(p: number, shared: boolean) {
  await rpc('fzth_set_share', { p_profile: p, p_code: codes[p], p_shared: shared });
  team = { ...team, [p]: shared }; emit(); void sync();
}
export const teamInfo = () => ({ team, teamLoaded });

/** Objectifs cochés d'un personnage (utile pour les autres membres de l'équipe). */
export function listDone(profile: number, prefix = ''): string[] {
  const out: string[] = []; const pre = `${profile}|${prefix}`;
  for (const [k, e] of entries) if (e.done && k.startsWith(pre)) out.push(k.slice(String(profile).length + 1));
  return out;
}

/** Quantité possédée (ressources de métiers). done = quantité suffisante pour le besoin indiqué. */
export function setQty(profile: number, id: string, qty: number, need: number) {
  const k = key(profile, id);
  const q = Math.max(0, Math.min(100_000_000, Math.floor(qty) || 0));
  const cur = entries.get(k);
  if (cur && cur.qty === q && cur.done === (q >= need)) return;
  entries.set(k, { done: q >= need, qty: q, at: new Date().toISOString() });
  pending.add(k);
  save(); emit();
  if (qtyTimer) clearTimeout(qtyTimer);
  qtyTimer = setTimeout(() => void sync(), 800); // attend la fin de la saisie
}
let qtyTimer: ReturnType<typeof setTimeout> | null = null;
export const qtyOf = (profile: number, id: string) => entries.get(key(profile, id))?.qty;

export function isDone(profile: number, id: string) {
  if (doneRaw(profile, id)) return true;
  const l = links.get(id); return !!l && l.some(o => o !== id && doneRaw(profile, o));
}

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
  // Autre onglet / fenêtre overlay du même navigateur : on relit les coches tout de suite.
  window.addEventListener('storage', e => { if (e.key === LS_DATA || e.key === LS_CODES) { load(); emit(); } });
}

// ---------- Sauvegarde / restauration dans un fichier ----------
export interface Backup { app: 'fzth'; version: 1; profile: number; exportedAt: string; entries: [string, Entry][] }
/** Toute la progression d'un personnage (quêtes, succès, ressources, choix, quantités). */
export function exportProfile(p: number): Backup {
  const pre = `${p}|`;
  return { app: 'fzth', version: 1, profile: p, exportedAt: new Date().toISOString(),
    entries: [...entries].filter(([k]) => k.startsWith(pre)).map(([k, e]) => [k.slice(pre.length), e]) };
}
/** Fusionne une sauvegarde : pour chaque objectif, la version la plus récente gagne. Renvoie le nombre d'objectifs repris. */
export function importProfile(p: number, b: Backup): number {
  if (b?.app !== 'fzth' || !Array.isArray(b.entries)) throw new Error('Ce fichier n’est pas une sauvegarde du site.');
  let n = 0;
  for (const [id, e] of b.entries) {
    if (typeof id !== 'string' || typeof e?.done !== 'boolean' || typeof e.at !== 'string') continue;
    const k = key(p, id); const cur = entries.get(k);
    if (cur && Date.parse(cur.at) >= Date.parse(e.at)) continue;
    entries.set(k, { done: e.done, at: e.at, ...(typeof e.qty === 'number' ? { qty: e.qty } : {}) });
    pending.add(k); n++;
  }
  save(); emit(); void sync();
  return n;
}

// ---------- Code oublié ----------
const tokenKey = (p: number) => `fzth:v2:resetToken:${p}`;
export const resetToken = (p: number) => { try { return localStorage.getItem(tokenKey(p)); } catch { return null; } };
/** Demande de réinitialisation : un jeton secret reste sur cet appareil, un coéquipier doit accepter. */
export async function askReset(p: number) {
  const t = [...crypto.getRandomValues(new Uint8Array(24))].map(b => b.toString(16).padStart(2, '0')).join('');
  await rpc('fzth_reset_ask', { p_profile: p, p_token: t });
  try { localStorage.setItem(tokenKey(p), t); } catch { /* ignore */ }
}
export async function resetStatus(p: number): Promise<'none' | 'pending' | 'approved'> {
  const t = resetToken(p); if (!t) return 'none';
  return (await rpc<'none' | 'pending' | 'approved'>('fzth_reset_status', { p_profile: p, p_token: t })) ?? 'none';
}
/** Choisit le nouveau code (après accord d'un coéquipier) puis se connecte avec. */
export async function finishReset(p: number, code: string) {
  const t = resetToken(p); if (!t) throw new Error('Demande introuvable sur cet appareil.');
  await rpc('fzth_reset_finish', { p_profile: p, p_token: t, p_new_code: code.trim() });
  try { localStorage.removeItem(tokenKey(p)); } catch { /* ignore */ }
  delete hashes[p]; writeLS(LS_HASHES, hashes);
  return login(p, code);
}
export async function listResetRequests(p: number) {
  return (await rpc<{ profile_id: number; requested_at: string; approved_at: string | null }[]>('fzth_reset_list', { p_profile: p, p_code: codes[p] })) ?? [];
}
export const approveReset = (p: number, target: number) => rpc('fzth_reset_approve', { p_profile: p, p_code: codes[p], p_target: target });

// ---------- Signalements d'erreurs ----------
export interface Report { id: string; profile_id: number; item_id: string; label: string; body: string; created_at: string; resolved: boolean }
export const addReport = (p: number, item: string, label: string, body: string) => rpc('fzth_report_add', { p_profile: p, p_code: codes[p], p_item: item, p_label: label, p_body: body });
export const listReports = async (p: number) => (await rpc<Report[]>('fzth_report_list', { p_profile: p, p_code: codes[p] })) ?? [];
export const resolveReport = (p: number, id: string, resolved: boolean) => rpc('fzth_report_resolve', { p_profile: p, p_code: codes[p], p_id: id, p_resolved: resolved });
export const entryAt = (profile: number, id: string) => entries.get(key(profile, id))?.at;

// ---- Codes cadeaux Dofus partagés par l'équipe ----
export interface Gift { id: string; code: string; reward: string; expires: string | null; added_by: number; created_at: string }
export async function listGifts(p: number) { return (await rpc<Gift[]>('fzth_gift_list', { p_profile: p, p_code: codes[p] })) ?? []; }
export const addGift = (p: number, gift: string, reward: string, expires: string | null) =>
  rpc<string>('fzth_gift_add', { p_profile: p, p_code: codes[p], p_gift: gift, p_reward: reward, p_expires: expires || null });
export const deleteGift = (p: number, id: string) => rpc('fzth_gift_delete', { p_profile: p, p_code: codes[p], p_id: id });
