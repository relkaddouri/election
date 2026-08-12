-- =============================================================================
-- Le cadre devient une personne identifiée, comme l'électeur
--
--   name -> full_name          (aligne cadres et electeurs)
--   + cin UNIQUE               (unique PARMI LES CADRES : un cadre peut aussi
--                               être enregistré comme électeur avec le même CIN)
--   + polling_station_number
--   + polling_location
--
-- Seul `phone` reste facultatif.
-- =============================================================================

alter table public.cadres rename column name to full_name;

alter table public.cadres
  add column if not exists cin text,
  add column if not exists polling_station_number text,
  add column if not exists polling_location text;

-- Renseigne les lignes déjà présentes avant de poser les contraintes NOT NULL.
-- Le CIN provisoire dérive de l'id, donc unique par construction ; il est
-- volontairement reconnaissable pour être corrigé à la main.
update public.cadres
set
  cin = coalesce(cin, 'TMP' || upper(substr(replace(id::text, '-', ''), 1, 9))),
  polling_station_number = coalesce(polling_station_number, 'غير محدد'),
  polling_location = coalesce(polling_location, 'غير محدد')
where
  cin is null
  or polling_station_number is null
  or polling_location is null;

alter table public.cadres
  alter column cin set not null,
  alter column polling_station_number set not null,
  alter column polling_location set not null;

alter table public.cadres
  add constraint cadres_cin_key unique (cin),
  add constraint cadres_cin_not_blank check (btrim(cin) <> ''),
  add constraint cadres_polling_station_not_blank
    check (btrim(polling_station_number) <> ''),
  add constraint cadres_polling_location_not_blank
    check (btrim(polling_location) <> '');

comment on constraint cadres_cin_key on public.cadres is
  'Unicité limitée à la table cadres. Un cadre peut figurer en parallèle dans '
  'electeurs avec le même CIN : ce sont deux rôles distincts de la même personne.';

-- -----------------------------------------------------------------------------
-- Normalisation partagée
--
-- Les deux tables portent désormais les mêmes colonnes personne ; un seul
-- trigger suffit. Il garantit que la contrainte UNIQUE porte sur la forme
-- canonique du CIN dans les deux cas.
-- -----------------------------------------------------------------------------

create or replace function public.normalize_person_row()
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
  for each row execute function public.normalize_person_row();

drop trigger if exists cadres_normalize_trg on public.cadres;
create trigger cadres_normalize_trg
  before insert or update on public.cadres
  for each row execute function public.normalize_person_row();

drop function if exists public.electeurs_normalize();

-- -----------------------------------------------------------------------------
-- Index
-- -----------------------------------------------------------------------------

drop index if exists public.cadres_name_trgm_idx;

create index if not exists cadres_full_name_trgm_idx
  on public.cadres using gin (full_name extensions.gin_trgm_ops);
create index if not exists cadres_cin_trgm_idx
  on public.cadres using gin (cin extensions.gin_trgm_ops);
create index if not exists cadres_polling_station_number_idx
  on public.cadres (polling_station_number);
create index if not exists cadres_polling_location_idx
  on public.cadres (polling_location);
