-- From Zero to Hero — schéma v2. À exécuter UNE fois dans Supabase > SQL Editor (tout le fichier, sans rien modifier).
-- Chaque personnage a son propre code, choisi par son joueur à la première connexion sur le site.
-- Les tables ne sont PAS accessibles directement avec la clé publique : tout passe par les fonctions ci-dessous,
-- qui vérifient le code du personnage. L'ancienne table team_progress n'est pas modifiée.
--
-- Code oublié : supprimer la ligne du personnage, puis il en choisira un nouveau à la prochaine connexion
-- (0 = Furionette, 1 = Volrod, 2 = Zepharyen) :   delete from public.fzth_profile_code where profile_id = 0;

create table if not exists public.fzth_profile_code (
  profile_id integer primary key check (profile_id between 0 and 2),
  code_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.fzth_progress (
  profile_id integer not null check (profile_id between 0 and 2),
  item_id text not null check (length(item_id) between 1 and 200),
  done boolean not null,
  updated_at timestamptz not null default now(),
  primary key (profile_id, item_id)
);

alter table public.fzth_profile_code enable row level security;
alter table public.fzth_progress enable row level security;
revoke all on public.fzth_profile_code, public.fzth_progress from anon, authenticated;

create or replace function public.fzth_hash(p_profile integer, p_code text) returns text
language sql immutable as $$
  select encode(sha256(convert_to(p_profile::text || ':' || coalesce(p_code, ''), 'UTF8')), 'hex')
$$;

-- Le personnage a-t-il déjà un code ? (pour afficher « choisis ton code » ou « entre ton code »)
create or replace function public.fzth_status(p_profile integer) returns boolean
language sql security definer set search_path = public as $$
  select exists (select 1 from fzth_profile_code where profile_id = p_profile)
$$;

create or replace function public.fzth_check(p_profile integer, p_code text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from fzth_profile_code where profile_id = p_profile and code_hash = fzth_hash(p_profile, p_code)) then
    perform pg_sleep(0.7); -- ralentit les essais au hasard
    raise exception 'code invalide';
  end if;
end $$;

-- Première connexion : enregistre le code choisi. Ensuite : vérifie le code. Renvoie 'created' ou 'ok'.
create or replace function public.fzth_login(p_profile integer, p_code text) returns text
language plpgsql security definer set search_path = public as $$
begin
  if p_profile not between 0 and 2 then raise exception 'personnage inconnu'; end if;
  if not exists (select 1 from fzth_profile_code where profile_id = p_profile) then
    if length(coalesce(p_code, '')) < 4 then raise exception 'code trop court'; end if;
    insert into fzth_profile_code (profile_id, code_hash) values (p_profile, fzth_hash(p_profile, p_code))
    on conflict (profile_id) do nothing;
    if found then return 'created'; end if;
  end if;
  perform fzth_check(p_profile, p_code);
  return 'ok';
end $$;

create or replace function public.fzth_get(p_profile integer, p_code text)
returns table (profile_id integer, item_id text, done boolean, updated_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  perform fzth_check(p_profile, p_code);
  return query select p.profile_id, p.item_id, p.done, p.updated_at from fzth_progress p where p.profile_id = p_profile;
end $$;

-- p_items : [{ "id": "...", "done": true, "at": "2026-11-19T10:00:00Z" }, ...]
-- Chaque objectif garde la modification la plus récente (aucun écrasement global).
create or replace function public.fzth_set(p_profile integer, p_code text, p_items jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform fzth_check(p_profile, p_code);
  if jsonb_array_length(p_items) > 2000 then raise exception 'trop d''objectifs en une fois'; end if;
  insert into fzth_progress as t (profile_id, item_id, done, updated_at)
  select p_profile, x->>'id', (x->>'done')::boolean, least(coalesce((x->>'at')::timestamptz, now()), now() + interval '5 minutes')
  from jsonb_array_elements(p_items) x
  on conflict (profile_id, item_id) do update
    set done = excluded.done, updated_at = excluded.updated_at
    where excluded.updated_at >= t.updated_at;
end $$;

revoke all on function public.fzth_check(integer, text), public.fzth_status(integer), public.fzth_login(integer, text),
  public.fzth_get(integer, text), public.fzth_set(integer, text, jsonb) from public;
grant execute on function public.fzth_status(integer), public.fzth_login(integer, text),
  public.fzth_get(integer, text), public.fzth_set(integer, text, jsonb) to anon;

-- ---------- Outils : bibliothèque de stuffs DofusBook, partagée entre les 3 personnages ----------
create table if not exists public.fzth_stuff (
  id uuid primary key default gen_random_uuid(),
  profile_id integer not null check (profile_id between 0 and 2), -- qui l'a ajouté
  name text not null check (length(name) between 1 and 90),
  url text not null check (url ~ '^https://' and length(url) <= 500),
  created_at timestamptz not null default now()
);
alter table public.fzth_stuff enable row level security;
revoke all on public.fzth_stuff from anon, authenticated;

create or replace function public.fzth_stuff_list(p_profile integer, p_code text)
returns table (id uuid, profile_id integer, name text, url text, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  perform fzth_check(p_profile, p_code);
  return query select s.id, s.profile_id, s.name, s.url, s.created_at from fzth_stuff s order by s.created_at desc;
end $$;

create or replace function public.fzth_stuff_add(p_profile integer, p_code text, p_name text, p_url text) returns uuid
language plpgsql security definer set search_path = public as $$
declare new_id uuid;
begin
  perform fzth_check(p_profile, p_code);
  if (select count(*) from fzth_stuff) >= 500 then raise exception 'bibliothèque pleine'; end if;
  insert into fzth_stuff (profile_id, name, url) values (p_profile, trim(p_name), trim(p_url)) returning id into new_id;
  return new_id;
end $$;

create or replace function public.fzth_stuff_delete(p_profile integer, p_code text, p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform fzth_check(p_profile, p_code);
  delete from fzth_stuff where id = p_id;
end $$;

revoke all on function public.fzth_stuff_list(integer, text), public.fzth_stuff_add(integer, text, text, text), public.fzth_stuff_delete(integer, text, uuid) from public;
grant execute on function public.fzth_stuff_list(integer, text), public.fzth_stuff_add(integer, text, text, text), public.fzth_stuff_delete(integer, text, uuid) to anon;

-- ---------- Équipe : chacun choisit de partager (ou non) sa progression avec les deux autres, en lecture seule ----------
alter table public.fzth_profile_code add column if not exists shared boolean not null default false;

create or replace function public.fzth_set_share(p_profile integer, p_code text, p_shared boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform fzth_check(p_profile, p_code);
  update fzth_profile_code set shared = p_shared where profile_id = p_profile;
end $$;

-- Qui partage ? (0, 1, 2 ; absent = pas encore de code)
create or replace function public.fzth_team_status(p_profile integer, p_code text)
returns table (profile_id integer, shared boolean)
language plpgsql security definer set search_path = public as $$
begin
  perform fzth_check(p_profile, p_code);
  return query select c.profile_id, c.shared from fzth_profile_code c order by c.profile_id;
end $$;

-- Progression des AUTRES personnages qui partagent la leur (lecture seule).
create or replace function public.fzth_team_get(p_profile integer, p_code text)
returns table (profile_id integer, item_id text, done boolean, updated_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  perform fzth_check(p_profile, p_code);
  return query select p.profile_id, p.item_id, p.done, p.updated_at from fzth_progress p
    join fzth_profile_code c on c.profile_id = p.profile_id
    where c.shared and p.profile_id <> p_profile;
end $$;

revoke all on function public.fzth_set_share(integer, text, boolean), public.fzth_team_status(integer, text), public.fzth_team_get(integer, text) from public;
grant execute on function public.fzth_set_share(integer, text, boolean), public.fzth_team_status(integer, text), public.fzth_team_get(integer, text) to anon;

-- ---------- Messagerie d'équipe (lisible par les 3 personnages) ----------
-- kind : 'text' (message libre), 'offer' (propose une ressource en surplus), 'take' (accepte une offre), 'done' (annonce : Dofus terminé…)
create table if not exists public.fzth_message (
  id uuid primary key default gen_random_uuid(),
  profile_id integer not null check (profile_id between 0 and 2),
  kind text not null check (kind in ('text', 'offer', 'take', 'done')),
  body text not null check (length(body) between 1 and 500),
  ref text check (ref is null or length(ref) <= 200),   -- ressource / Dofus concerné, ou id de l'offre acceptée
  created_at timestamptz not null default now()
);
alter table public.fzth_message enable row level security;
revoke all on public.fzth_message from anon, authenticated;

create or replace function public.fzth_msg_list(p_profile integer, p_code text)
returns table (id uuid, profile_id integer, kind text, body text, ref text, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  perform fzth_check(p_profile, p_code);
  return query select m.id, m.profile_id, m.kind, m.body, m.ref, m.created_at from fzth_message m order by m.created_at desc limit 200;
end $$;

create or replace function public.fzth_msg_post(p_profile integer, p_code text, p_kind text, p_body text, p_ref text) returns uuid
language plpgsql security definer set search_path = public as $$
declare new_id uuid;
begin
  perform fzth_check(p_profile, p_code);
  insert into fzth_message (profile_id, kind, body, ref) values (p_profile, p_kind, trim(p_body), p_ref) returning id into new_id;
  -- On garde les 500 derniers messages.
  delete from fzth_message where id in (select id from fzth_message order by created_at desc offset 500);
  return new_id;
end $$;

revoke all on function public.fzth_msg_list(integer, text), public.fzth_msg_post(integer, text, text, text, text) from public;
grant execute on function public.fzth_msg_list(integer, text), public.fzth_msg_post(integer, text, text, text, text) to anon;
