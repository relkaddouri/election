-- =============================================================================
-- Support de la page « الناخبون »
--
--   1. Vue ajoutant رقم الترتيب (numéro d'ordre) et le nom du cadre
--   2. Fonction de détection de doublon CIN, renvoyant le cadre concerné
-- =============================================================================

-- -----------------------------------------------------------------------------
-- electeurs_ordered
--
-- رقم الترتيب n'est pas stocké : il est calculé par `row_number()` au sein de
-- chaque cadre. Une colonne persistée se troueraient à la première suppression
-- et devrait être renumérotée à chaque insertion.
--
-- `security_invoker = true` : le RLS de l'appelant s'applique. La numérotation
-- reste cohérente parce que les policies donnent accès aux électeurs d'un cadre
-- en tout ou rien — jamais à un sous-ensemble qui décalerait le comptage.
-- -----------------------------------------------------------------------------
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
    order by e.created_at, e.id
  )::int as order_number
from public.electeurs e
join public.cadres c on c.id = e.cadre_id;

comment on view public.electeurs_ordered is
  'Électeurs + رقم الترتيب calculé par cadre + nom du cadre. Le numéro d''ordre '
  'n''est jamais saisi ni stocké.';

grant select on public.electeurs_ordered to authenticated;

-- -----------------------------------------------------------------------------
-- electeur_cin_lookup
--
-- Le cahier des charges demande d'afficher « هذا الناخب مسجل مسبقاً في النظام »
-- **avec le cadre concerné**. Une requête ordinaire serait filtrée par le RLS :
-- un utilisateur « saisie » ne verrait pas le doublon logé chez un cadre hors
-- de son périmètre et croirait le CIN libre, jusqu'au rejet par la contrainte
-- UNIQUE.
--
-- Compromis assumé : la fonction révèle le nom du cadre détenteur, y compris
-- hors périmètre. C'est le but même de la détection de doublons en campagne
-- (savoir qui a déjà inscrit cet électeur). Elle ne renvoie rien d'autre — ni
-- identité de l'électeur, ni téléphone, ni bureau de vote.
-- -----------------------------------------------------------------------------
create or replace function public.electeur_cin_lookup(
  p_cin text,
  p_exclude_id uuid default null
)
returns table (cadre_id uuid, cadre_full_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.full_name
  from public.electeurs e
  join public.cadres c on c.id = e.cadre_id
  where public.current_user_role() is not null
    and e.cin = public.normalize_cin(p_cin)
    and (p_exclude_id is null or e.id <> p_exclude_id)
  limit 1;
$$;

revoke all on function public.electeur_cin_lookup(text, uuid) from public, anon;
grant execute on function public.electeur_cin_lookup(text, uuid) to authenticated;
