-- =============================================================================
-- Exposition de created_by / updated_by dans la vue des électeurs
--
-- La vue liste ses colonnes explicitement : les colonnes d'auteur ajoutées à la
-- table `electeurs` n'y remontaient donc pas.
--
-- `create or replace view` refuse d'insérer des colonnes ailleurs qu'à la fin
-- et de réordonner l'existant ; on supprime donc la vue avant de la recréer.
-- =============================================================================

drop view if exists public.electeurs_ordered;

create view public.electeurs_ordered
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
  e.created_by,
  e.updated_by,
  c.full_name as cadre_full_name,
  row_number() over (
    partition by e.cadre_id
    order by e.seq
  )::int as order_number
from public.electeurs e
join public.cadres c on c.id = e.cadre_id;

comment on view public.electeurs_ordered is
  'Électeurs + رقم الترتيب calculé par cadre + nom du cadre + auteurs. Le '
  'numéro d''ordre n''est jamais saisi ni stocké.';

grant select on public.electeurs_ordered to authenticated;
