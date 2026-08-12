-- =============================================================================
-- Séquence d'insertion des électeurs
--
-- رقم الترتيب était départagé par `(created_at, id)`. Or `now()` est constant
-- sur toute une transaction : une insertion en lot (import Excel prévu en V2,
-- seed) donne un `created_at` identique à toutes les lignes, et l'ordre
-- retombe alors sur l'UUID — stable, mais arbitraire.
--
-- Une identité monotone tranche sans ambiguïté, quelle que soit la façon dont
-- les lignes ont été écrites.
-- =============================================================================

alter table public.electeurs
  add column if not exists seq bigint generated always as identity;

comment on column public.electeurs.seq is
  'Ordre d''insertion. Sert uniquement à calculer رقم الترتيب de façon '
  'déterministe ; n''est jamais affiché ni saisi.';

create index if not exists electeurs_cadre_seq_idx
  on public.electeurs (cadre_id, seq);

create or replace view public.electeurs_ordered
with (security_invoker = true) as
select
  e.id,
  e.cadre_id,
  e.cin,
  e.full_name,
  e.phone,
  e.polling_station_number,
  e.polling_location,
  e.created_at,
  e.updated_at,
  c.full_name as cadre_full_name,
  row_number() over (
    partition by e.cadre_id
    order by e.seq
  )::int as order_number
from public.electeurs e
join public.cadres c on c.id = e.cadre_id;

grant select on public.electeurs_ordered to authenticated;
