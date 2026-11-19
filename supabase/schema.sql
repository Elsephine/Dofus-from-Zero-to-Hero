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

-- Supabase donne par défaut l'exécution des fonctions de « public » aux rôles anon / authenticated :
-- on retire explicitement ce qui ne doit pas être appelé directement.
revoke execute on function public.fzth_check(integer, text), public.fzth_hash(integer, text) from anon, authenticated;
alter function public.fzth_hash(integer, text) set search_path = public, pg_catalog;

-- ---------- Objectifs de session (« aujourd'hui : derniers combats du Cauchemar… »), communs aux 3 personnages ----------
create table if not exists public.fzth_goal (
  id uuid primary key default gen_random_uuid(),
  profile_id integer not null check (profile_id between 0 and 2),
  title text not null check (length(title) between 1 and 120),
  dofus_id text not null check (length(dofus_id) <= 60),
  item_ids jsonb not null check (jsonb_typeof(item_ids) = 'array' and jsonb_array_length(item_ids) between 1 and 200),
  closed boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.fzth_goal enable row level security;
revoke all on public.fzth_goal from anon, authenticated;

create or replace function public.fzth_goal_list(p_profile integer, p_code text)
returns table (id uuid, profile_id integer, title text, dofus_id text, item_ids jsonb, closed boolean, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  perform fzth_check(p_profile, p_code);
  return query select g.id, g.profile_id, g.title, g.dofus_id, g.item_ids, g.closed, g.created_at from fzth_goal g order by g.created_at desc limit 20;
end $$;

create or replace function public.fzth_goal_create(p_profile integer, p_code text, p_title text, p_dofus text, p_items jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare new_id uuid;
begin
  perform fzth_check(p_profile, p_code);
  insert into fzth_goal (profile_id, title, dofus_id, item_ids) values (p_profile, trim(p_title), p_dofus, p_items) returning id into new_id;
  delete from fzth_goal where id in (select id from fzth_goal order by created_at desc offset 50);
  return new_id;
end $$;

create or replace function public.fzth_goal_close(p_profile integer, p_code text, p_id uuid, p_closed boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform fzth_check(p_profile, p_code);
  update fzth_goal set closed = p_closed where id = p_id;
end $$;

revoke all on function public.fzth_goal_list(integer, text), public.fzth_goal_create(integer, text, text, text, jsonb), public.fzth_goal_close(integer, text, uuid, boolean) from public;
grant execute on function public.fzth_goal_list(integer, text), public.fzth_goal_create(integer, text, text, text, jsonb), public.fzth_goal_close(integer, text, uuid, boolean) to anon;

-- ---------- Quantités possédées (ressources de métiers) : colonne qty, renvoyée par fzth_get / fzth_team_get ----------
alter table public.fzth_progress add column if not exists qty integer check (qty is null or qty between 0 and 100000000);

drop function if exists public.fzth_get(integer, text);
create function public.fzth_get(p_profile integer, p_code text)
returns table (profile_id integer, item_id text, done boolean, updated_at timestamptz, qty integer)
language plpgsql security definer set search_path = public as $$
begin
  perform fzth_check(p_profile, p_code);
  return query select p.profile_id, p.item_id, p.done, p.updated_at, p.qty from fzth_progress p where p.profile_id = p_profile;
end $$;

drop function if exists public.fzth_team_get(integer, text);
create function public.fzth_team_get(p_profile integer, p_code text)
returns table (profile_id integer, item_id text, done boolean, updated_at timestamptz, qty integer)
language plpgsql security definer set search_path = public as $$
begin
  perform fzth_check(p_profile, p_code);
  return query select p.profile_id, p.item_id, p.done, p.updated_at, p.qty from fzth_progress p
    join fzth_profile_code c on c.profile_id = p.profile_id
    where c.shared and p.profile_id <> p_profile;
end $$;

-- p_items : [{ "id": "...", "done": true, "at": "...", "qty": 120 (facultatif) }]
create or replace function public.fzth_set(p_profile integer, p_code text, p_items jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform fzth_check(p_profile, p_code);
  if jsonb_array_length(p_items) > 2000 then raise exception 'trop d''objectifs en une fois'; end if;
  insert into fzth_progress as t (profile_id, item_id, done, updated_at, qty)
  select p_profile, x->>'id', (x->>'done')::boolean, least(coalesce((x->>'at')::timestamptz, now()), now() + interval '5 minutes'), (x->>'qty')::integer
  from jsonb_array_elements(p_items) x
  on conflict (profile_id, item_id) do update
    set done = excluded.done, updated_at = excluded.updated_at, qty = excluded.qty
    where excluded.updated_at >= t.updated_at;
end $$;

revoke all on function public.fzth_get(integer, text), public.fzth_team_get(integer, text) from public;
grant execute on function public.fzth_get(integer, text), public.fzth_team_get(integer, text) to anon;

-- ---------- Présence (qui a le site ouvert, et sur quelle page) ----------
create table if not exists public.fzth_presence (
  profile_id integer primary key check (profile_id between 0 and 2),
  page text check (page is null or length(page) <= 80),
  last_seen timestamptz not null default now()
);
alter table public.fzth_presence enable row level security;
revoke all on public.fzth_presence from anon, authenticated;

create or replace function public.fzth_ping(p_profile integer, p_code text, p_page text)
returns table (profile_id integer, page text, last_seen timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  perform fzth_check(p_profile, p_code);
  insert into fzth_presence as t (profile_id, page, last_seen) values (p_profile, left(p_page, 80), now())
  on conflict on constraint fzth_presence_pkey do update set page = excluded.page, last_seen = now();
  return query select x.profile_id, x.page, x.last_seen from fzth_presence x;
end $$;

-- ---------- Disponibilités de la semaine : créneaux d'une heure, en heure de Paris (« jour-heure », ex. « 4-21 » = vendredi 21 h) ----------
create table if not exists public.fzth_avail (
  profile_id integer primary key check (profile_id between 0 and 2),
  slots jsonb not null default '[]'::jsonb check (jsonb_typeof(slots) = 'array' and jsonb_array_length(slots) <= 168),
  note text check (note is null or length(note) <= 200),
  updated_at timestamptz not null default now()
);
alter table public.fzth_avail enable row level security;
revoke all on public.fzth_avail from anon, authenticated;

create or replace function public.fzth_avail_list(p_profile integer, p_code text)
returns table (profile_id integer, slots jsonb, note text, updated_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  perform fzth_check(p_profile, p_code);
  return query select a.profile_id, a.slots, a.note, a.updated_at from fzth_avail a;
end $$;

create or replace function public.fzth_avail_set(p_profile integer, p_code text, p_slots jsonb, p_note text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform fzth_check(p_profile, p_code);
  insert into fzth_avail as t (profile_id, slots, note, updated_at) values (p_profile, p_slots, p_note, now())
  on conflict (profile_id) do update set slots = excluded.slots, note = excluded.note, updated_at = now();
end $$;

-- ---------- Répartition de la récolte : « je m'occupe de cette ressource » ----------
create table if not exists public.fzth_claim (
  item_id text primary key check (length(item_id) between 1 and 200),
  profile_id integer not null check (profile_id between 0 and 2),
  created_at timestamptz not null default now()
);
alter table public.fzth_claim enable row level security;
revoke all on public.fzth_claim from anon, authenticated;

create or replace function public.fzth_claim_list(p_profile integer, p_code text)
returns table (item_id text, profile_id integer, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  perform fzth_check(p_profile, p_code);
  return query select c.item_id, c.profile_id, c.created_at from fzth_claim c;
end $$;

-- p_claim = true : prendre (si libre ou déjà à moi) ; false : relâcher (seulement si c'est à moi).
create or replace function public.fzth_claim_set(p_profile integer, p_code text, p_item text, p_claim boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform fzth_check(p_profile, p_code);
  if p_claim then
    insert into fzth_claim (item_id, profile_id) values (p_item, p_profile) on conflict (item_id) do nothing;
  else
    delete from fzth_claim where item_id = p_item and profile_id = p_profile;
  end if;
end $$;

revoke all on function public.fzth_ping(integer, text, text), public.fzth_avail_list(integer, text), public.fzth_avail_set(integer, text, jsonb, text),
  public.fzth_claim_list(integer, text), public.fzth_claim_set(integer, text, text, boolean) from public;
grant execute on function public.fzth_ping(integer, text, text), public.fzth_avail_list(integer, text), public.fzth_avail_set(integer, text, jsonb, text),
  public.fzth_claim_list(integer, text), public.fzth_claim_set(integer, text, text, boolean) to anon;
