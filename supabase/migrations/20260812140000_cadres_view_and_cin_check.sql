-- =============================================================================
-- Support de la page « المؤطرون »
--
--   1. Vue exposant le nombre d'électeurs par cadre (calculé, jamais stocké)
--   2. Fonction de vérification d'unicité du CIN pendant la saisie
-- =============================================================================

-- -----------------------------------------------------------------------------
-- cadres_with_counts
--
-- `security_invoker = true` : la vue s'exécute avec les droits de l'appelant,
-- donc le RLS de `cadres` ET de `electeurs` s'applique normalement. Sans cette
-- option, la vue tournerait avec les droits de son propriétaire et
-- contournerait le cloisonnement des utilisateurs « saisie ».
-- -----------------------------------------------------------------------------
create or replace view public.cadres_with_counts
with (security_invoker = true) as
select
  c.id,
  c.cin,
  c.full_name,
  c.phone,
  c.polling_station_number,
  c.polling_location,
  c.is_active,
  c.created_at,
  c.updated_at,
  (
    select count(*)
    from public.electeurs e
    where e.cadre_id = c.id
  )::int as electeurs_count
from public.cadres c;

comment on view public.cadres_with_counts is
  'Cadres + COUNT des électeurs. Le nombre est toujours dérivé : aucune '
  'colonne compteur n''existe, donc aucune désynchronisation possible.';

grant select on public.cadres_with_counts to authenticated;

-- -----------------------------------------------------------------------------
-- cadre_cin_exists
--
-- La vérification en temps réel doit répondre correctement même quand le CIN
-- appartient à un cadre que l'utilisateur n'a pas le droit de voir : un
-- utilisateur « saisie » ne perçoit que ses cadres affectés, une simple
-- requête filtrée par le RLS répondrait donc « CIN libre » avant que la
-- contrainte UNIQUE ne rejette l'écriture.
--
-- SECURITY DEFINER, mais ne renvoie qu'un booléen : rien d'autre ne fuit que
-- l'existence du CIN, ce que l'utilisateur découvrirait de toute façon en
-- soumettant le formulaire.
-- -----------------------------------------------------------------------------
create or replace function public.cadre_cin_exists(
  p_cin text,
  p_exclude_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    -- Utilisateur inactif ou absent : aucune réponse.
    when public.current_user_role() is null then null
    else exists (
      select 1
      from public.cadres c
      where c.cin = public.normalize_cin(p_cin)
        and (p_exclude_id is null or c.id <> p_exclude_id)
    )
  end;
$$;

revoke all on function public.cadre_cin_exists(text, uuid) from public, anon;
grant execute on function public.cadre_cin_exists(text, uuid) to authenticated;
