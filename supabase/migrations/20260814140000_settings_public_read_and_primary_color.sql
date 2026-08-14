-- =============================================================================
-- Paramètres lisibles avant connexion + couleur principale personnalisable
--
--   1. Colonne `primary_color`
--   2. Lecture anonyme des seules colonnes d'habillage
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Couleur principale
--
-- `NULL` signifie « non configurée » : l'application retombe alors sur sa
-- couleur par défaut. Le CHECK impose la notation hexadécimale à 6 chiffres,
-- seule forme que sait produire un `<input type="color">` et que la feuille de
-- style peut consommer telle quelle.
-- -----------------------------------------------------------------------------

alter table public.settings
  add column if not exists primary_color text;

alter table public.settings
  drop constraint if exists settings_primary_color_format;
alter table public.settings
  add constraint settings_primary_color_format
    check (primary_color is null or primary_color ~ '^#[0-9a-fA-F]{6}$');

comment on column public.settings.primary_color is
  'Couleur d''accent de l''interface, en hexadécimal (#rrggbb). NULL = valeur '
  'par défaut de l''application.';

-- -----------------------------------------------------------------------------
-- 2. Lecture anonyme de l'habillage
--
-- La page de connexion affiche le logo, le nom du parti et applique la couleur
-- principale — avant toute authentification. Il faut donc que `anon` puisse
-- lire ces valeurs.
--
-- Le RLS filtre les LIGNES, pas les colonnes. La restriction par colonne passe
-- par un GRANT : `anon` ne reçoit que les quatre colonnes d'habillage.
-- `territorial_community` reste hors de sa portée, et toute colonne ajoutée
-- plus tard le sera aussi par défaut — un oubli ne peut donc pas l'exposer.
--
-- L'écriture n'est pas touchée : INSERT / UPDATE / DELETE restent réservés au
-- super_admin par les policies existantes, qui ne visent que `authenticated`.
-- -----------------------------------------------------------------------------

drop policy if exists settings_public_read on public.settings;
create policy settings_public_read on public.settings
  for select to anon
  using (true);

revoke all on public.settings from anon;
grant select (id, party_name, logo_url, primary_color)
  on public.settings to anon;
