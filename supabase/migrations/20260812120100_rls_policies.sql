-- =============================================================================
-- Policies RLS — 3 rôles
--
--   super_admin    accès total
--   saisie         lecture/écriture limitées aux cadres listés dans user_cadres
--   parlementaire  lecture seule globale, aucune écriture
--
-- Un utilisateur désactivé (is_active = false) perd tout accès : les fonctions
-- d'aide renvoient NULL, et NULL dans une clause USING vaut « refusé ».
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Fonctions d'aide
--
-- SECURITY DEFINER : appartenant au propriétaire des tables, elles lisent
-- profiles / user_cadres sans repasser par le RLS. C'est ce qui évite la
-- récursion infinie d'une policy sur profiles qui interrogerait profiles.
-- `set search_path = ''` impose le nommage qualifié et bloque le détournement
-- par un schéma temporaire.
-- -----------------------------------------------------------------------------

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.profiles p
  where p.id = (select auth.uid())
    and p.is_active;
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.current_user_role() = 'super_admin';
$$;

-- Lecture : super_admin et parlementaire voient tout, saisie son périmètre.
create or replace function public.can_read_cadre(target_cadre_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case public.current_user_role()
    when 'super_admin' then true
    when 'parlementaire' then true
    when 'saisie' then exists (
      select 1
      from public.user_cadres uc
      where uc.user_id = (select auth.uid())
        and uc.cadre_id = target_cadre_id
    )
    else false
  end;
$$;

-- Écriture : parlementaire exclu (lecture seule).
create or replace function public.can_write_cadre(target_cadre_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case public.current_user_role()
    when 'super_admin' then true
    when 'saisie' then exists (
      select 1
      from public.user_cadres uc
      where uc.user_id = (select auth.uid())
        and uc.cadre_id = target_cadre_id
    )
    else false
  end;
$$;

revoke all on function public.current_user_role() from public, anon;
revoke all on function public.is_super_admin() from public, anon;
revoke all on function public.can_read_cadre(uuid) from public, anon;
revoke all on function public.can_write_cadre(uuid) from public, anon;

grant execute on function public.current_user_role() to authenticated;
grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.can_read_cadre(uuid) to authenticated;
grant execute on function public.can_write_cadre(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or public.current_user_role() in ('super_admin', 'parlementaire')
  );

-- Les créations passent par le trigger on_auth_user_created (SECURITY DEFINER)
-- ou par le client admin ; aucun utilisateur n'insère de profil directement.
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert to authenticated
  with check (public.is_super_admin());

-- Volontairement réservé au super_admin : autoriser l'édition de sa propre
-- ligne ouvrirait l'auto-attribution du rôle 'super_admin', que le RLS seul ne
-- sait pas restreindre colonne par colonne.
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists profiles_delete on public.profiles;
create policy profiles_delete on public.profiles
  for delete to authenticated
  using (public.is_super_admin());

-- -----------------------------------------------------------------------------
-- cadres
-- -----------------------------------------------------------------------------

drop policy if exists cadres_select on public.cadres;
create policy cadres_select on public.cadres
  for select to authenticated
  using (public.can_read_cadre(id));

drop policy if exists cadres_insert on public.cadres;
create policy cadres_insert on public.cadres
  for insert to authenticated
  with check (public.is_super_admin());

-- Un « saisie » peut corriger le nom/téléphone d'un cadre de son périmètre.
drop policy if exists cadres_update on public.cadres;
create policy cadres_update on public.cadres
  for update to authenticated
  using (public.can_write_cadre(id))
  with check (public.can_write_cadre(id));

drop policy if exists cadres_delete on public.cadres;
create policy cadres_delete on public.cadres
  for delete to authenticated
  using (public.is_super_admin());

-- -----------------------------------------------------------------------------
-- electeurs
-- -----------------------------------------------------------------------------

drop policy if exists electeurs_select on public.electeurs;
create policy electeurs_select on public.electeurs
  for select to authenticated
  using (public.can_read_cadre(cadre_id));

drop policy if exists electeurs_insert on public.electeurs;
create policy electeurs_insert on public.electeurs
  for insert to authenticated
  with check (public.can_write_cadre(cadre_id));

-- USING porte sur la ligne avant modification, WITH CHECK sur la ligne après :
-- les deux sont nécessaires pour empêcher un « saisie » de déplacer un électeur
-- vers un cadre hors de son périmètre (ou d'en faire entrer un).
drop policy if exists electeurs_update on public.electeurs;
create policy electeurs_update on public.electeurs
  for update to authenticated
  using (public.can_write_cadre(cadre_id))
  with check (public.can_write_cadre(cadre_id));

drop policy if exists electeurs_delete on public.electeurs;
create policy electeurs_delete on public.electeurs
  for delete to authenticated
  using (public.can_write_cadre(cadre_id));

-- -----------------------------------------------------------------------------
-- user_cadres
-- -----------------------------------------------------------------------------

-- Chacun doit pouvoir lire ses propres affectations (l'UI en a besoin) ;
-- seul le super_admin voit et modifie celles des autres.
drop policy if exists user_cadres_select on public.user_cadres;
create policy user_cadres_select on public.user_cadres
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_super_admin());

drop policy if exists user_cadres_insert on public.user_cadres;
create policy user_cadres_insert on public.user_cadres
  for insert to authenticated
  with check (public.is_super_admin());

drop policy if exists user_cadres_update on public.user_cadres;
create policy user_cadres_update on public.user_cadres
  for update to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists user_cadres_delete on public.user_cadres;
create policy user_cadres_delete on public.user_cadres
  for delete to authenticated
  using (public.is_super_admin());

-- -----------------------------------------------------------------------------
-- settings
-- -----------------------------------------------------------------------------

-- Lisible par tout utilisateur actif : nom du parti et logo alimentent les
-- en-têtes PDF/Excel.
drop policy if exists settings_select on public.settings;
create policy settings_select on public.settings
  for select to authenticated
  using (public.current_user_role() is not null);

drop policy if exists settings_insert on public.settings;
create policy settings_insert on public.settings
  for insert to authenticated
  with check (public.is_super_admin());

drop policy if exists settings_update on public.settings;
create policy settings_update on public.settings
  for update to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists settings_delete on public.settings;
create policy settings_delete on public.settings
  for delete to authenticated
  using (public.is_super_admin());

-- -----------------------------------------------------------------------------
-- audit_logs — append-only
-- -----------------------------------------------------------------------------

drop policy if exists audit_logs_select on public.audit_logs;
create policy audit_logs_select on public.audit_logs
  for select to authenticated
  using (public.is_super_admin());

-- Chaque utilisateur actif journalise ses propres actions, et uniquement
-- sous son identité.
drop policy if exists audit_logs_insert on public.audit_logs;
create policy audit_logs_insert on public.audit_logs
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.current_user_role() is not null
  );

-- Aucune policy UPDATE ni DELETE : le journal n'est ni modifiable ni effaçable,
-- y compris par un super_admin (le client `secret` reste seul à pouvoir purger).

-- -----------------------------------------------------------------------------
-- Privilèges de table
--
-- Le RLS ne s'applique qu'aux rôles qui détiennent déjà le privilège SQL.
-- `anon` (utilisateur non connecté) n'en reçoit aucun : tout passe par une
-- session authentifiée.
-- -----------------------------------------------------------------------------

revoke all on all tables in schema public from anon;

grant select, insert, update, delete on
  public.profiles, public.cadres, public.electeurs,
  public.user_cadres, public.settings
  to authenticated;

grant select, insert on public.audit_logs to authenticated;
