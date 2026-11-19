// Objectifs de session communs : un Dofus + une sélection de quêtes (ex. « derniers combats du Cauchemar »).
// Chaque membre voit l'avancement de chacun (si la progression est partagée). Lecture toutes les 20 s.
import { useSyncExternalStore } from 'react';
import { codeFor, rpc } from './progress';

export interface Goal { id: string; profile_id: number; title: string; dofus_id: string; item_ids: string[]; closed: boolean; created_at: string }
const LS = 'fzth:v2:goals';
let active: number | null = null;
let goals: Goal[] = (() => { try { return JSON.parse(localStorage.getItem(LS) ?? '[]'); } catch { return []; } })();
let online: boolean | null = null;
let version = 0;
const listeners = new Set<() => void>();
const emit = () => { version++; listeners.forEach(l => l()); };

async function poll() {
  const p = active; if (p === null || !codeFor(p)) return;
  try {
    goals = (await rpc<Goal[]>('fzth_goal_list', { p_profile: p, p_code: codeFor(p) })) ?? [];
    online = true; try { localStorage.setItem(LS, JSON.stringify(goals)); } catch { /* ignore */ }
  } catch { online = false; }
  emit();
}
let timer: ReturnType<typeof setInterval> | null = null;
export function watchGoals(p: number | null) {
  if (active === p) return; active = p;
  if (timer) clearInterval(timer);
  if (p !== null) { void poll(); timer = setInterval(() => void poll(), 20_000); }
}
export async function createGoal(title: string, dofusId: string, itemIds: string[]) {
  const p = active; if (p === null) throw new Error('aucun personnage');
  await rpc('fzth_goal_create', { p_profile: p, p_code: codeFor(p), p_title: title, p_dofus: dofusId, p_items: itemIds });
  await poll();
}
export async function closeGoal(id: string, closed = true) {
  const p = active; if (p === null) return;
  await rpc('fzth_goal_close', { p_profile: p, p_code: codeFor(p), p_id: id, p_closed: closed });
  await poll();
}
export function useGoals() {
  useSyncExternalStore(cb => { listeners.add(cb); return () => listeners.delete(cb); }, () => version);
  return { goals, online, open: goals.filter(g => !g.closed) };
}
