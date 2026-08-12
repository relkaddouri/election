-- =============================================================================
-- Champs obligatoires côté électeur
--
--   رقم الهاتف        (phone)
--   مكتب التصويت      (polling_station_number)
--   مكان التصويت      (polling_location)
--
-- Ces trois champs étaient facultatifs ; ils deviennent requis. Un électeur
-- sans téléphone ni bureau de vote n'est pas exploitable le jour du scrutin.
--
-- NB : `cadres.phone` reste facultatif — décision distincte, prise lors de
-- l'ajout des champs personne au cadre.
-- =============================================================================

-- Aucune ligne existante n'est nulle sur ces colonnes : la contrainte peut être
-- posée sans valeur de remplissage arbitraire.
alter table public.electeurs
  alter column phone set not null,
  alter column polling_station_number set not null,
  alter column polling_location set not null;

-- Le trigger `normalize_person_row` transforme une saisie vide en NULL
-- (`nullif(btrim(…), '')`). Ces contraintes rattrapent donc aussi les chaînes
-- composées uniquement d'espaces.
alter table public.electeurs
  add constraint electeurs_phone_not_blank check (btrim(phone) <> ''),
  add constraint electeurs_polling_station_not_blank
    check (btrim(polling_station_number) <> ''),
  add constraint electeurs_polling_location_not_blank
    check (btrim(polling_location) <> '');
