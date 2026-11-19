-- From Zero to Hero — schéma v2. À exécuter UNE fois dans Supabase > SQL Editor.
-- 1) Remplace MON-CODE à la dernière ligne par le code d'équipe de votre choix (à donner à Volrod et Zepharyen).
-- 2) Exécute tout le fichier.
-- Les tables ne sont PAS accessibles directement avec la clé publique : tout passe par les 2 fonctions ci-dessous,
-- qui refusent un mauvais code d'équipe. L'ancienne table team_progress n'est pas modifiée.

create table if not exists public.fzth_team (
  id integer primary key default 1 check (id = 1),
  code_hash text not null
);

create table if not exists public.fzth_progress (
  profile_id integer not null check (profile_id between 0 and 2),
  item_id text not null check (length(item_id) between 1 and 200),
  done boolean not null,
  updated_at timestamptz not null default now(),
  primary key (profile_id, item_id)
);

alter table public.fzth_team enable row level security;
alter table public.fzth_progress enable row level security;
revoke all on public.fzth_team, public.fzth_progress from anon, authenticated;

create or replace function public.fzth_check(p_code text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from fzth_team where code_hash = encode(sha256(convert_to(coalesce(p_code, ''), 'UTF8')), 'hex')) then
    raise exception 'code d''équipe invalide';
  end if;
end $$;

create or replace function public.fzth_get(p_code text)
returns table (profile_id integer, item_id text, done boolean, updated_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  perform fzth_check(p_code);
  return query select p.profile_id, p.item_id, p.done, p.updated_at from fzth_progress p;
end $$;

-- p_items : [{ "id": "...", "done": true, "at": "2026-11-19T10:00:00Z" }, ...]
-- Chaque objectif garde la modification la plus récente (aucun écrasement global).
create or replace function public.fzth_set(p_code text, p_profile integer, p_items jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform fzth_check(p_code);
  if jsonb_array_length(p_items) > 2000 then raise exception 'trop d''objectifs en une fois'; end if;
  insert into fzth_progress as t (profile_id, item_id, done, updated_at)
  select p_profile, x->>'id', (x->>'done')::boolean, least(coalesce((x->>'at')::timestamptz, now()), now() + interval '5 minutes')
  from jsonb_array_elements(p_items) x
  on conflict (profile_id, item_id) do update
    set done = excluded.done, updated_at = excluded.updated_at
    where excluded.updated_at >= t.updated_at;
end $$;

revoke all on function public.fzth_check(text), public.fzth_get(text), public.fzth_set(text, integer, jsonb) from public;
grant execute on function public.fzth_get(text), public.fzth_set(text, integer, jsonb) to anon;

insert into public.fzth_team (id, code_hash) values (1, encode(sha256(convert_to('MON-CODE', 'UTF8')), 'hex'))
on conflict (id) do update set code_hash = excluded.code_hash;
