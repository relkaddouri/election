import "server-only";

import { createClient } from "@/lib/supabase/server";

/** Ligne portant les colonnes d'auteur posées par `set_row_authorship`. */
export type Authored = {
  created_by: string | null;
  updated_by: string | null;
};

/** La même ligne, enrichie des noms affichables. */
export type WithAuthorNames<T> = T & {
  createdByName: string | null;
  updatedByName: string | null;
};

/**
 * Résout des identifiants d'utilisateur en noms affichables.
 *
 * Passe par `user_display_names` et non par `profiles` : la policy
 * `profiles_select` n'autorise un « saisie » qu'à lire son propre profil, et
 * l'auteur d'une ligne saisie par un collègue resterait vide — précisément le
 * cas où la traçabilité sert.
 *
 * Une seule requête quelle que soit la taille de la liste : résoudre ligne par
 * ligne multiplierait les allers-retours sur une page de 25 résultats.
 */
export async function resolveAuthorNames(
  ids: (string | null)[],
): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  if (unique.length === 0) return new Map();

  const supabase = await createClient();
  const { data } = await supabase
    .from("user_display_names")
    .select("id, full_name")
    .in("id", unique);

  return new Map((data ?? []).map((row) => [row.id, row.full_name]));
}

/**
 * Attache les noms d'auteur à une ligne.
 *
 * `null` quand l'écriture est antérieure à l'ajout des colonnes, ou faite sans
 * session (script de maintenance avec la clé secrète).
 */
export function attachAuthorNames<T extends Authored>(
  row: T,
  names: Map<string, string>,
): WithAuthorNames<T> {
  return {
    ...row,
    createdByName: row.created_by ? (names.get(row.created_by) ?? null) : null,
    updatedByName: row.updated_by ? (names.get(row.updated_by) ?? null) : null,
  };
}

/** Résout les auteurs d'une liste entière en une seule requête. */
export async function attachAuthorNamesToAll<T extends Authored>(
  rows: T[],
): Promise<WithAuthorNames<T>[]> {
  const names = await resolveAuthorNames(
    rows.flatMap((row) => [row.created_by, row.updated_by]),
  );
  return rows.map((row) => attachAuthorNames(row, names));
}
