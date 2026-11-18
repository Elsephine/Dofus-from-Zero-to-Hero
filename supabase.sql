-- À exécuter dans Supabase > SQL Editor.
-- ATTENTION : aucune authentification. Quiconque possède le lien et la clé publique
-- peut lire et modifier les progressions. Ne stockez aucune donnée sensible.
create table if not exists public.team_progress (
  profile_id integer primary key check (profile_id between 0 and 2),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.team_progress enable row level security;
grant select, insert, update on public.team_progress to anon;
drop policy if exists "team_read" on public.team_progress;
drop policy if exists "team_insert" on public.team_progress;
drop policy if exists "team_update" on public.team_progress;
create policy "team_read" on public.team_progress for select to anon using (true);
create policy "team_insert" on public.team_progress for insert to anon with check (true);
create policy "team_update" on public.team_progress for update to anon using (true) with check (true);
