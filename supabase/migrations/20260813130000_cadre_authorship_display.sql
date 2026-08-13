-- =============================================================================
-- Affichage de « أضيف بواسطة » / « عدل بواسطة » sur la fiche d'un cadre
--
--   1. La vue des cadres expose created_by / updated_by
--   2. Une vue minimale résout un identifiant d'utilisateur en nom affichable
-- =============================================================================

-- -----------------------------------------------------------------------------
-- user_display_names
--
-- La policy `profiles_select` n'autorise un « saisie » qu'à lire SON profil.
-- Sans cette vue, la fiche d'un cadre créé par quelqu'un d'autre afficherait un
-- auteur vide pour lui — la traçabilité demandée serait inopérante là où elle
-- sert le plus.
--
-- Volontairement SANS `security_invoker` : la vue s'exécute avec les droits de
-- son propriétaire et contourne donc le RLS de `profiles`. La divulgation est
-- délibérément réduite au strict nécessaire — **identifiant et nom affiché,
-- rien d'autre**. Ni e-mail, ni rôle, ni statut d'activation, ni téléphone.
-- Les membres d'une équipe de campagne se connaissent par leur nom ; l'adresse
-- et le rôle, eux, restent protégés.
-- -----------------------------------------------------------------------------
create or replace view public.user_display_names as
select
  p.id,
  p.full_name
from public.profiles p;

comment on view public.user_display_names is
  'Résolution identifiant -> nom affichable, lisible par tout utilisateur '
  'authentifié. N''expose que id et full_name : voir la migration pour le '
  'raisonnement sur la divulgation.';

revoke all on public.user_display_names from anon;
grant select on public.user_display_names to authenticated;

-- -----------------------------------------------------------------------------
-- cadres_with_counts : ajout des colonnes d'auteur
--
-- `create or replace view` refuse de retirer ou réordonner des colonnes ; on
-- supprime donc la vue avant de la recréer. Les colonnes existantes gardent
-- leur ordre, les nouvelles sont ajoutées à la fin.
-- -----------------------------------------------------------------------------
drop view if exists public.cadres_with_counts;

create view public.cadres_with_counts
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
  c.created_by,
  c.updated_by,
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
