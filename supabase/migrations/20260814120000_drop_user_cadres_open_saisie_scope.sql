-- =============================================================================
-- Suppression du cloisonnement par affectation
--
-- Le rôle « saisie » accède désormais à TOUS les cadres et TOUS les électeurs.
-- La table `user_cadres`, qui portait les affectations, n'a plus d'objet.
--
--   1. Policies de cadres / electeurs réécrites sans référence à l'affectation
--   2. Trigger d'auto-affectation du créateur supprimé
--   3. Policies puis table `user_cadres` supprimées
--   4. Fonctions d'aide can_read_cadre / can_write_cadre supprimées
--
-- Ordre imposé : une fonction ne peut pas être supprimée tant qu'une policy
-- l'utilise, et une table pas tant qu'une policy la référence.
--
-- DELETE sur `electeurs` reste ouvert au rôle « saisie » : la demande ne
-- restreint explicitement que la suppression des cadres.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. cadres
-- -----------------------------------------------------------------------------

drop policy if exists cadres_select on public.cadres;
create policy cadres_select on public.cadres
  for select to authenticated
  -- Tout utilisateur actif voit tous les cadres. `current_user_role()` renvoie
  -- NULL pour un compte désactivé, ce qui referme l'accès sans le supprimer.
  using (public.current_user_role() is not null);

drop policy if exists cadres_update on public.cadres;
create policy cadres_update on public.cadres
  for update to authenticated
  using (public.current_user_role() in ('super_admin', 'saisie'))
  with check (public.current_user_role() in ('super_admin', 'saisie'));

-- INSERT (super_admin + saisie) et DELETE (super_admin seul) sont déjà
-- conformes : ils ne consultaient pas l'affectation.

-- -----------------------------------------------------------------------------
-- 2. electeurs
-- -----------------------------------------------------------------------------

drop policy if exists electeurs_select on public.electeurs;
create policy electeurs_select on public.electeurs
  for select to authenticated
  using (public.current_user_role() is not null);

drop policy if exists electeurs_insert on public.electeurs;
create policy electeurs_insert on public.electeurs
  for insert to authenticated
  with check (public.current_user_role() in ('super_admin', 'saisie'));

drop policy if exists electeurs_update on public.electeurs;
create policy electeurs_update on public.electeurs
  for update to authenticated
  using (public.current_user_role() in ('super_admin', 'saisie'))
  with check (public.current_user_role() in ('super_admin', 'saisie'));

drop policy if exists electeurs_delete on public.electeurs;
create policy electeurs_delete on public.electeurs
  for delete to authenticated
  using (public.current_user_role() in ('super_admin', 'saisie'));

-- -----------------------------------------------------------------------------
-- 3. Auto-affectation du créateur
--
-- Elle n'existait que pour rendre visible à un « saisie » le cadre qu'il venait
-- de créer, alors qu'il ne voyait que ses affectations. Il les voit tous
-- désormais.
-- -----------------------------------------------------------------------------

drop trigger if exists cadres_assign_to_creator on public.cadres;
drop function if exists public.assign_new_cadre_to_creator();

-- -----------------------------------------------------------------------------
-- 4. Table des affectations
-- -----------------------------------------------------------------------------

drop policy if exists user_cadres_select on public.user_cadres;
drop policy if exists user_cadres_insert on public.user_cadres;
drop policy if exists user_cadres_update on public.user_cadres;
drop policy if exists user_cadres_delete on public.user_cadres;

drop table if exists public.user_cadres;

-- -----------------------------------------------------------------------------
-- 5. Fonctions d'aide devenues sans objet
--
-- Elles prenaient un identifiant de cadre pour décider de l'accès. Les garder
-- en les faisant ignorer leur argument serait trompeur pour la relecture.
-- -----------------------------------------------------------------------------

drop function if exists public.can_read_cadre(uuid);
drop function if exists public.can_write_cadre(uuid);
