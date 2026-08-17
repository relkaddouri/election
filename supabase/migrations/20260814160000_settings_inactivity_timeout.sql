-- =============================================================================
-- Délai d'inactivité réglable depuis « الإعدادات »
--
-- `NULL` = valeur par défaut de l'application (15 minutes).
--
-- Bornes : au moins 1 minute — en dessous, l'utilisateur serait déconnecté en
-- pleine saisie — et au plus 8 heures, au-delà de quoi la déconnexion
-- automatique ne protège plus rien sur un poste partagé.
--
-- La colonne n'est PAS ajoutée au GRANT du rôle `anon` : la page de connexion
-- n'en a pas l'usage, et le délai d'expiration d'une session n'a pas à être
-- lisible sans être connecté.
-- =============================================================================

alter table public.settings
  add column if not exists inactivity_timeout_minutes integer;

alter table public.settings
  drop constraint if exists settings_inactivity_timeout_range;
alter table public.settings
  add constraint settings_inactivity_timeout_range
    check (
      inactivity_timeout_minutes is null
      or inactivity_timeout_minutes between 1 and 480
    );

comment on column public.settings.inactivity_timeout_minutes is
  'Minutes d''inactivité avant déconnexion automatique. NULL = 15 par défaut.';
