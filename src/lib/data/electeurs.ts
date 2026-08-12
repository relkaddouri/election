import "server-only";

import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type {
  DuplicateCadre,
  Electeur,
  ElecteurWithOrder,
  Paginated,
} from "@/types";

/**
 * Neutralise les caractères que PostgREST interprète structurellement dans une
 * expression `or(...)` — voir `lib/data/cadres.ts` pour le détail.
 */
function sanitizeSearchTerm(term: string): string {
  return term.replace(/[,()\\%_*]/g, " ").trim();
}

export type ElecteurFilters = {
  search?: string;
  cadreId?: string;
  pollingStation?: string;
  pollingLocation?: string;
};

export type ElecteurListParams = ElecteurFilters & {
  page?: number;
  pageSize?: number;
};

/**
 * Électeurs visibles, filtrés et paginés.
 *
 * `count: "exact"` fait renvoyer par PostgREST le nombre total de lignes
 * correspondant aux filtres, indépendamment de la page demandée : sans lui,
 * « عدد النتائج » n'afficherait que la taille de la page courante.
 */
export async function listElecteurs({
  search,
  cadreId,
  pollingStation,
  pollingLocation,
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
}: ElecteurListParams): Promise<Paginated<ElecteurWithOrder>> {
  const supabase = await createClient();

  let query = supabase
    .from("electeurs_ordered")
    .select("*", { count: "exact" })
    // Tri pleinement déterministe : deux cadres peuvent porter le même nom,
    // d'où `cadre_id` en départage avant le numéro d'ordre. Sans cela, une
    // ligne pourrait apparaître sur deux pages ou sur aucune.
    .order("cadre_full_name", { ascending: true })
    .order("cadre_id", { ascending: true })
    .order("order_number", { ascending: true });

  if (cadreId) query = query.eq("cadre_id", cadreId);
  if (pollingStation)
    query = query.eq("polling_station_number", pollingStation);
  if (pollingLocation) query = query.eq("polling_location", pollingLocation);

  const term = search ? sanitizeSearchTerm(search) : "";
  if (term) {
    query = query.or(
      `full_name.ilike.%${term}%,cin.ilike.%${term}%,phone.ilike.%${term}%`,
    );
  }

  const safePage = Math.max(1, Math.trunc(page));
  const from = (safePage - 1) * pageSize;

  const { data, count, error } = await query.range(from, from + pageSize - 1);
  if (error)
    throw new Error(`Lecture des électeurs impossible : ${error.message}`);

  return {
    rows: data ?? [],
    total: count ?? 0,
    page: safePage,
    pageSize,
  };
}

/** Un électeur, ou `null` s'il n'existe pas ou est hors périmètre RLS. */
export async function getElecteur(id: string): Promise<Electeur | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("electeurs")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data;
}

export type FilterOptions = {
  pollingStations: string[];
  pollingLocations: string[];
};

/**
 * Valeurs proposées dans les filtres bureau / lieu.
 *
 * Restreindre au cadre sélectionné évite de proposer des options qui ne
 * donneraient aucun résultat une fois les filtres combinés.
 */
export async function getElecteurFilterOptions(
  cadreId?: string,
): Promise<FilterOptions> {
  const supabase = await createClient();

  let query = supabase
    .from("electeurs_filter_options")
    .select("polling_station_number, polling_location");
  if (cadreId) query = query.eq("cadre_id", cadreId);

  const { data } = await query;

  const stations = new Set<string>();
  const locations = new Set<string>();
  for (const row of data ?? []) {
    if (row.polling_station_number) stations.add(row.polling_station_number);
    if (row.polling_location) locations.add(row.polling_location);
  }

  // Tri arabe : `Array.sort()` par défaut compare les points de code UTF-16 et
  // classerait mal les libellés en arabe.
  const collator = new Intl.Collator("ar", { numeric: true });
  return {
    pollingStations: [...stations].sort(collator.compare),
    pollingLocations: [...locations].sort(collator.compare),
  };
}

/**
 * Cadre détenteur d'un CIN déjà enregistré, ou `null` si le CIN est libre.
 *
 * Passe par une fonction SECURITY DEFINER : une requête ordinaire, filtrée par
 * le RLS, laisserait croire qu'un CIN logé chez un cadre hors périmètre est
 * disponible.
 */
export async function findElecteurCinOwner(
  cin: string,
  excludeId?: string,
): Promise<DuplicateCadre | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("electeur_cin_lookup", {
    p_cin: cin,
    p_exclude_id: excludeId ?? null,
  });

  if (error || !data || data.length === 0) return null;
  return {
    cadreId: data[0].cadre_id,
    cadreFullName: data[0].cadre_full_name,
  };
}
