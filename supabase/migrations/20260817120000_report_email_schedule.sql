-- =============================================================================
-- Envoi du rapport Excel complet par e-mail : destinataire et planification
--
-- L'envoi manuel et l'envoi automatique partagent le même destinataire
-- (`report_email`) : deux adresses distinctes auraient signifié qu'un rapport
-- envoyé à la main n'arrive pas où arrivent les rapports planifiés.
--
-- Aucune de ces colonnes n'est ajoutée au GRANT du rôle `anon` : la page de
-- connexion n'en a pas l'usage, et une adresse de destinataire n'a pas à être
-- lisible sans être connecté.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Fréquence
--
-- Un type énuméré plutôt qu'un `text` + CHECK : la contrainte devient visible
-- dans le schéma, et une valeur inconnue est refusée dès l'écriture plutôt que
-- de traverser jusqu'au calcul d'échéance côté application.
-- -----------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'report_frequency') then
    create type public.report_frequency as enum ('daily', 'weekly', 'monthly');
  end if;
end
$$;

alter table public.settings
  add column if not exists report_email text,
  -- `NOT NULL DEFAULT 'daily'` : « daily » est la seule fréquence qui ne
  -- dépende d'aucune colonne annexe, donc la seule valeur initiale qui
  -- satisfasse les contraintes de cohérence ci-dessous sur la ligne existante.
  add column if not exists report_frequency public.report_frequency
    not null default 'daily',
  -- 0 = dimanche … 6 = samedi, comme `Date.getDay()` et `extract(dow …)`.
  add column if not exists report_weekday integer,
  add column if not exists report_day_of_month integer,
  add column if not exists report_enabled boolean not null default false,
  add column if not exists last_report_sent_at timestamptz;

-- -----------------------------------------------------------------------------
-- Bornes et cohérence
--
-- Les mêmes règles sont appliquées par la Server Action, avec des messages en
-- arabe. Elles sont redites ici parce que la base est le dernier rempart : une
-- planification incohérente ne se manifesterait que le jour où le rapport
-- n'arrive pas.
-- -----------------------------------------------------------------------------

alter table public.settings
  drop constraint if exists settings_report_weekday_range;
alter table public.settings
  add constraint settings_report_weekday_range
    check (report_weekday is null or report_weekday between 0 and 6);

alter table public.settings
  drop constraint if exists settings_report_day_of_month_range;
alter table public.settings
  add constraint settings_report_day_of_month_range
    check (report_day_of_month is null or report_day_of_month between 1 and 31);

-- Une fréquence hebdomadaire sans jour de semaine — ou mensuelle sans quantième
-- — ne désigne aucune date : l'envoi automatique ne partirait jamais.
alter table public.settings
  drop constraint if exists settings_report_schedule_coherent;
alter table public.settings
  add constraint settings_report_schedule_coherent
    check (
      case report_frequency
        when 'weekly' then report_weekday is not null
        when 'monthly' then report_day_of_month is not null
        else true
      end
    );

-- Activer l'envoi sans destinataire produirait un échec silencieux à 6 h du
-- matin, sans que rien ne le signale dans l'interface.
alter table public.settings
  drop constraint if exists settings_report_enabled_needs_email;
alter table public.settings
  add constraint settings_report_enabled_needs_email
    check (
      report_enabled is false
      or (report_email is not null and report_email <> '')
    );

comment on column public.settings.report_email is
  'Destinataire du rapport Excel, pour l''envoi manuel comme automatique.';
comment on column public.settings.report_weekday is
  'Jour d''envoi si report_frequency = weekly. 0 = dimanche … 6 = samedi.';
comment on column public.settings.report_day_of_month is
  'Quantième d''envoi si report_frequency = monthly. Un quantième absent du '
  'mois en cours (30, 31) déclenche l''envoi le dernier jour du mois.';
comment on column public.settings.last_report_sent_at is
  'Dernier envoi réussi, manuel ou automatique. Sert à ne pas envoyer deux '
  'fois le même jour.';
