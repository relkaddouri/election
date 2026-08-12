-- =============================================================================
-- Schéma initial — application de gestion des électeurs
--
-- Tables : profiles, cadres, electeurs, user_cadres, settings, audit_logs
-- Le RLS est activé ici ; les policies sont dans la migration suivante.
-- =============================================================================

create extension if not exists pg_trgm with schema extensions;

-- -----------------------------------------------------------------------------
-- Types
-- -----------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('super_admin', 'saisie', 'parlementaire');
  end if;
end
$$;

-- -----------------------------------------------------------------------------
-- Fonctions utilitaires
-- -----------------------------------------------------------------------------

-- Convertit les chiffres arabo-indiens (٠-٩) et perso-arabes (۰-۹) en chiffres
-- occidentaux. Le clavier arabe produit les premiers ; sans normalisation, deux
-- écritures du même CIN passeraient la contrainte UNIQUE.
create or replace function public.to_western_digits(value text)
returns text
language sql
immutable
strict
as $$
  select translate(
    value,
    '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹',
    '01234567890123456789'
  );
$$;

-- Forme canonique d'un CIN : chiffres occidentaux, sans espace, en majuscules.
-- C'est cette valeur qui est stockée, donc celle sur laquelle porte l'unicité.
create or replace function public.normalize_cin(value text)
returns text
language sql
immutable
strict
as $$
  select upper(regexp_replace(public.to_western_digits(value), '\s', '', 'g'));
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- profiles — un enregistrement par utilisateur auth.users
-- -----------------------------------------------------------------------------

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null check (btrim(full_name) <> ''),
  phone       text,
  role        public.user_role not null default 'saisie',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

comment on table public.profiles is
  'Profil applicatif adossé à auth.users. Le rôle détermine toutes les policies RLS.';

create index if not exists profiles_role_idx on public.profiles (role);

-- Création automatique du profil à l''inscription.
--
-- SÉCURITÉ : le rôle n''est délibérément PAS lu depuis raw_user_meta_data.
-- Ces métadonnées sont modifiables par l''utilisateur lui-même lors du signup ;
-- les y lire permettrait à quiconque de s''auto-attribuer 'super_admin'.
-- Tout nouvel utilisateur démarre en 'saisie' ; seul un super_admin peut
-- ensuite élever son rôle.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
      split_part(new.email, '@', 1)
    ),
    nullif(btrim(new.raw_user_meta_data ->> 'phone'), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- cadres (المؤطرون)
-- -----------------------------------------------------------------------------

create table if not exists public.cadres (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (btrim(name) <> ''),
  phone       text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.cadres is
  'Encadrants. Le nombre d''électeurs n''est jamais stocké : il se calcule par COUNT.';

create index if not exists cadres_name_trgm_idx
  on public.cadres using gin (name extensions.gin_trgm_ops);

drop trigger if exists cadres_set_updated_at on public.cadres;
create trigger cadres_set_updated_at
  before update on public.cadres
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- electeurs (الناخبون)
-- -----------------------------------------------------------------------------

create table if not exists public.electeurs (
  id                     uuid primary key default gen_random_uuid(),
  cadre_id               uuid not null references public.cadres (id) on delete restrict,
  cin                    text not null,
  full_name              text not null check (btrim(full_name) <> ''),
  phone                  text,
  polling_station_number text,
  polling_location       text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),

  -- Exigence impérative du cahier des charges : l''unicité du CIN est garantie
  -- par PostgreSQL, pas seulement par l''application.
  constraint electeurs_cin_key unique (cin),
  constraint electeurs_cin_not_blank check (btrim(cin) <> '')
);

comment on constraint electeurs_cin_key on public.electeurs is
  'Source de vérité de la détection des doublons. Le code applicatif doit gérer '
  'la violation 23505 (saisie concurrente, contournement du contrôle front).';

-- `on delete restrict` : supprimer un cadre qui porte des électeurs doit
-- échouer explicitement plutôt que d''effacer les électeurs en cascade.

-- Normalisation avant écriture : la contrainte UNIQUE porte sur la forme
-- canonique, donc « 1234 AB », « ١٢٣٤ab » et « 1234ab » sont bien le même CIN.
create or replace function public.electeurs_normalize()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.cin := public.normalize_cin(new.cin);
  new.full_name := btrim(new.full_name);
  new.phone := nullif(
    regexp_replace(public.to_western_digits(coalesce(new.phone, '')), '\s', '', 'g'),
    ''
  );
  new.polling_station_number := nullif(
    btrim(public.to_western_digits(coalesce(new.polling_station_number, ''))),
    ''
  );
  new.polling_location := nullif(btrim(coalesce(new.polling_location, '')), '');
  return new;
end;
$$;

drop trigger if exists electeurs_normalize_trg on public.electeurs;
create trigger electeurs_normalize_trg
  before insert or update on public.electeurs
  for each row execute function public.electeurs_normalize();

drop trigger if exists electeurs_set_updated_at on public.electeurs;
create trigger electeurs_set_updated_at
  before update on public.electeurs
  for each row execute function public.set_updated_at();

-- Index exigés par le cahier des charges
create index if not exists electeurs_cadre_id_idx
  on public.electeurs (cadre_id);
create index if not exists electeurs_polling_station_number_idx
  on public.electeurs (polling_station_number);

-- Index de confort pour les filtres et la recherche (sections 9-11, 14)
create index if not exists electeurs_polling_location_idx
  on public.electeurs (polling_location);
create index if not exists electeurs_full_name_trgm_idx
  on public.electeurs using gin (full_name extensions.gin_trgm_ops);
create index if not exists electeurs_cin_trgm_idx
  on public.electeurs using gin (cin extensions.gin_trgm_ops);
create index if not exists electeurs_phone_trgm_idx
  on public.electeurs using gin (phone extensions.gin_trgm_ops);

-- -----------------------------------------------------------------------------
-- user_cadres — périmètre des utilisateurs « saisie »
-- -----------------------------------------------------------------------------

create table if not exists public.user_cadres (
  user_id   uuid not null references public.profiles (id) on delete cascade,
  cadre_id  uuid not null references public.cadres (id) on delete cascade,
  primary key (user_id, cadre_id)
);

comment on table public.user_cadres is
  'Affectation des utilisateurs "saisie" à des cadres. Détermine leur périmètre RLS.';

create index if not exists user_cadres_cadre_id_idx on public.user_cadres (cadre_id);

-- -----------------------------------------------------------------------------
-- settings — ligne unique
-- -----------------------------------------------------------------------------

create table if not exists public.settings (
  id                    uuid primary key default gen_random_uuid(),
  party_name            text,
  territorial_community text,
  logo_url              text,
  updated_at            timestamptz not null default now()
);

comment on table public.settings is
  'Paramètres globaux (en-têtes PDF/Excel). Contrainte : une seule ligne.';

create unique index if not exists settings_singleton_idx on public.settings ((true));

drop trigger if exists settings_set_updated_at on public.settings;
create trigger settings_set_updated_at
  before update on public.settings
  for each row execute function public.set_updated_at();

insert into public.settings (party_name, territorial_community)
values (null, null)
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- audit_logs (سجل العمليات) — append-only
-- -----------------------------------------------------------------------------

create table if not exists public.audit_logs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references public.profiles (id) on delete set null,
  action       text not null,
  entity_type  text not null,
  entity_id    uuid,
  created_at   timestamptz not null default now()
);

comment on table public.audit_logs is
  'Journal des opérations. Aucune policy UPDATE/DELETE : la table est append-only.';

create index if not exists audit_logs_created_at_idx
  on public.audit_logs (created_at desc);
create index if not exists audit_logs_user_id_idx on public.audit_logs (user_id);
create index if not exists audit_logs_entity_idx
  on public.audit_logs (entity_type, entity_id);

-- -----------------------------------------------------------------------------
-- Activation du RLS sur toutes les tables (policies : migration suivante)
-- -----------------------------------------------------------------------------

alter table public.profiles    enable row level security;
alter table public.cadres      enable row level security;
alter table public.electeurs   enable row level security;
alter table public.user_cadres enable row level security;
alter table public.settings    enable row level security;
alter table public.audit_logs  enable row level security;
