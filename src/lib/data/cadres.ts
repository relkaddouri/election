import "server-only";

import {
  attachAuthorNames,
  attachAuthorNamesToAll,
  resolveAuthorNames,
  type WithAuthorNames,
} from "@/lib/data/authors";
import { createClient } from "@/lib/supabase/server";
import type { Cadre, CadreWithCount } from "@/types";

/**
 * Neutralise les caractères que PostgREST interprète structurellement dans une
 * expression `or(...)`.
 *
 * Une virgule ou une parenthèse dans le terme saisi ne provoquerait pas une
 * erreur : elle serait lue comme un séparateur de filtre et changerait
 * silencieusement le sens de la requête. `%` et `_` sont retirés pour la même
 * raison côté `ilike`, où ils seraient des jokers.
 */
function sanitizeSearchTerm(term: string): string {
  return term.replace(/[,()\\%_*]/g, " ").trim();
}

export type CadreSearchParams = {
  search?: string;
};

/** Liste des cadres visibles par l'utilisateur, avec le nombre d'électeurs. */
export async function listCadres({
  search,
}: CadreSearchParams): Promise<CadreWithCount[]> {
  const supabase = await createClient();

  let query = supabase
    .from("cadres_with_counts")
    .select("*")
    .order("full_name", { ascending: true });

  const term = search ? sanitizeSearchTerm(search) : "";
  if (term) {
    query = query.or(
      `full_name.ilike.%${term}%,cin.ilike.%${term}%,phone.ilike.%${term}%,polling_location.ilike.%${term}%,polling_station_number.ilike.%${term}%`,
    );
  }

  const { data, error } = await query;
  if (error)
    throw new Error(`Lecture des cadres impossible : ${error.message}`);
  return data ?? [];
}

/** Un cadre, ou `null` s'il n'existe pas ou est hors périmètre RLS. */
export async function getCadre(id: string): Promise<CadreWithCount | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("cadres_with_counts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data;
}

/** Cadre enrichi des noms de son créateur et de son dernier modificateur. */
export type CadreWithAuthors = WithAuthorNames<CadreWithCount>;

export async function getCadreWithAuthors(
  id: string,
): Promise<CadreWithAuthors | null> {
  const cadre = await getCadre(id);
  if (!cadre) return null;

  const names = await resolveAuthorNames([cadre.created_by, cadre.updated_by]);
  return attachAuthorNames(cadre, names);
}

/** Liste des cadres, enrichie des noms de créateur et de modificateur. */
export async function listCadresWithAuthors(
  params: CadreSearchParams,
): Promise<CadreWithAuthors[]> {
  return attachAuthorNamesToAll(await listCadres(params));
}

/**
 * Le CIN est-il déjà porté par un autre cadre ?
 *
 * Passe par une fonction SECURITY DEFINER : une requête ordinaire serait
 * filtrée par le RLS et répondrait « libre » pour un cadre hors périmètre.
 */
export async function cadreCinExists(
  cin: string,
  excludeId?: string,
): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("cadre_cin_exists", {
    p_cin: cin,
    p_exclude_id: excludeId ?? null,
  });
  if (error) return false;
  return data === true;
}

export type { Cadre };
