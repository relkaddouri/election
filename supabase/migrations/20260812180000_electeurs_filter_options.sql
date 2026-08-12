-- =============================================================================
-- Valeurs disponibles pour les filtres de « الناخبون »
--
-- Alimenter les listes déroulantes en chargeant tous les électeurs pour en
-- extraire les valeurs distinctes ne tient pas à plusieurs milliers de lignes.
-- Un DISTINCT côté PostgreSQL ramène au plus quelques centaines de couples.
--
-- `security_invoker = true` : le RLS de l'appelant s'applique, donc un
-- utilisateur « saisie » ne se voit proposer que des valeurs présentes chez
-- ses propres cadres — aucun filtre ne peut mener à une liste vide, et aucune
-- valeur hors périmètre n'est révélée.
-- =============================================================================

create or replace view public.electeurs_filter_options
with (security_invoker = true) as
select distinct
  e.cadre_id,
  e.polling_station_number,
  e.polling_location
from public.electeurs e;

comment on view public.electeurs_filter_options is
  'Couples distincts (cadre, bureau, lieu) présents chez les électeurs '
  'visibles. Alimente les listes déroulantes de filtres.';

grant select on public.electeurs_filter_options to authenticated;
