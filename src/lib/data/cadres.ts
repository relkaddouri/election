import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Cadre, CadreWithCount, Electeur } from "@/types";

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

export type ElecteurFilters = {
  search?: string;
  pollingStation?: string;
  pollingLocation?: string;
};

/** Électeurs rattachés à un cadre, avec recherche et filtres locaux. */
export async function listElecteursForCadre(
  cadreId: string,
  { search, pollingStation, pollingLocation }: ElecteurFilters,
): Promise<Electeur[]> {
  const supabase = await createClient();

  let query = supabase
    .from("electeurs")
    .select("*")
    .eq("cadre_id", cadreId)
    .order("created_at", { ascending: true });

  const term = search ? sanitizeSearchTerm(search) : "";
  if (term) {
    query = query.or(
      `full_name.ilike.%${term}%,cin.ilike.%${term}%,phone.ilike.%${term}%`,
    );
  }
  if (pollingStation)
    query = query.eq("polling_station_number", pollingStation);
  if (pollingLocation) query = query.eq("polling_location", pollingLocation);

  const { data, error } = await query;
  if (error)
    throw new Error(`Lecture des électeurs impossible : ${error.message}`);
  return data ?? [];
}

/**
 * Valeurs distinctes présentes chez les électeurs d'un cadre, pour alimenter
 * les listes de filtres sans proposer d'option qui ne donnerait aucun résultat.
 */
export async function getElecteurFilterOptions(cadreId: string): Promise<{
  pollingStations: string[];
  pollingLocations: string[];
}> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("electeurs")
    .select("polling_station_number, polling_location")
    .eq("cadre_id", cadreId);

  const stations = new Set<string>();
  const locations = new Set<string>();
  for (const row of data ?? []) {
    if (row.polling_station_number) stations.add(row.polling_station_number);
    if (row.polling_location) locations.add(row.polling_location);
  }

  const collator = new Intl.Collator("ar");
  return {
    pollingStations: [...stations].sort(collator.compare),
    pollingLocations: [...locations].sort(collator.compare),
  };
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
