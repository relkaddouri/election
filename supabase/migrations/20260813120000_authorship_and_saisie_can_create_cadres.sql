-- =============================================================================
-- Traçabilité des écritures + ouverture de la création de cadres au rôle
-- « saisie »
--
--   1. created_by / updated_by sur cadres et electeurs
--   2. Remplissage automatique côté serveur, jamais par le client
--   3. cadres : INSERT et UPDATE ouverts au rôle « saisie », DELETE réservé
--      au super_admin
--   4. Un cadre créé par un « saisie » lui est automatiquement affecté
--
-- Migration additive : les tables contiennent déjà des données. Les lignes
-- antérieures gardent created_by / updated_by à NULL — l'auteur n'est pas
-- reconstituable a posteriori, et inventer une valeur serait mensonger.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Colonnes d'auteur
--
-- `on delete set null` : supprimer un compte ne doit pas supprimer les cadres
-- et électeurs qu'il a saisis. La trace de l'auteur disparaît, la donnée reste.
-- Nullable par nécessité : une écriture faite avec la clé secrète (scripts de
-- maintenance, migrations) n'a pas d'utilisateur connecté.
-- -----------------------------------------------------------------------------

alter table public.cadres
  add column if not exists created_by uuid references public.profiles (id) on delete set null,
  add column if not exists updated_by uuid references public.profiles (id) on delete set null;

alter table public.electeurs
  add column if not exists created_by uuid references public.profiles (id) on delete set null,
  add column if not exists updated_by uuid references public.profiles (id) on delete set null;

comment on column public.cadres.created_by is
  'Rempli par le trigger set_row_authorship. Toute valeur envoyée par le client est écrasée.';
comment on column public.electeurs.created_by is
  'Rempli par le trigger set_row_authorship. Toute valeur envoyée par le client est écrasée.';

-- -----------------------------------------------------------------------------
-- Remplissage automatique
--
-- Un trigger plutôt qu'un DEFAULT : un DEFAULT ne s'applique que si la colonne
-- est omise, un client pourrait donc envoyer `created_by` d'un autre
-- utilisateur et s'attribuer — ou attribuer à autrui — une écriture. Ici la
-- valeur transmise est systématiquement écrasée.
--
-- `created_by` est en outre rendu immuable : une modification ne peut pas
-- réécrire l'auteur d'origine.
-- -----------------------------------------------------------------------------

create or replace function public.set_row_authorship()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
begin
  if tg_op = 'INSERT' then
    new.created_by := actor;
    new.updated_by := actor;
  else
    new.created_by := old.created_by;
    new.updated_by := actor;
  end if;
  return new;
end;
$$;

drop trigger if exists cadres_set_authorship on public.cadres;
create trigger cadres_set_authorship
  before insert or update on public.cadres
  for each row execute function public.set_row_authorship();

drop trigger if exists electeurs_set_authorship on public.electeurs;
create trigger electeurs_set_authorship
  before insert or update on public.electeurs
  for each row execute function public.set_row_authorship();

-- -----------------------------------------------------------------------------
-- Le rôle « saisie » peut créer des cadres
--
-- DELETE reste réservé au super_admin : supprimer un cadre est irréversible et
-- porte sur les électeurs qui en dépendent.
-- -----------------------------------------------------------------------------

drop policy if exists cadres_insert on public.cadres;
create policy cadres_insert on public.cadres
  for insert to authenticated
  with check (public.current_user_role() in ('super_admin', 'saisie'));

-- -----------------------------------------------------------------------------
-- Affectation automatique du créateur
--
-- Sans cela, la règle « un saisie ne voit que les cadres de user_cadres »
-- rendrait invisible le cadre qu'il vient de créer : il disparaîtrait de sa
-- liste à la seconde même de son enregistrement.
--
-- SECURITY DEFINER : l'écriture dans user_cadres est réservée au super_admin
-- par le RLS. Le trigger l'insère pour le compte de l'utilisateur, et
-- uniquement pour le cadre qu'il vient lui-même de créer.
-- -----------------------------------------------------------------------------

create or replace function public.assign_new_cadre_to_creator()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
begin
  if actor is not null and public.current_user_role() = 'saisie' then
    insert into public.user_cadres (user_id, cadre_id)
    values (actor, new.id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists cadres_assign_to_creator on public.cadres;
create trigger cadres_assign_to_creator
  after insert on public.cadres
  for each row execute function public.assign_new_cadre_to_creator();
