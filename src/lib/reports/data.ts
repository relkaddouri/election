import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Cadre, Database, ElecteurWithOrder } from "@/types";

/**
 * Client à utiliser pour lire les données du rapport.
 *
 * Paramétrable parce que l'export a désormais deux appelants aux droits
 * différents : l'interface, où le client porte la session de l'utilisateur et
 * subit le RLS, et la tâche planifiée, qui s'exécute sans session et passe donc
 * par le client administrateur. Sans ce paramètre, le rapport automatique
 * serait vide.
 */
export type ReportClient = SupabaseClient<Database>;

export type ReportSettings = {
  partyName: string;
  territorialCommunity: string;
  logoUrl: string | null;
};

export type CadreReport = {
  cadre: Cadre;
  electeurs: ElecteurWithOrder[];
};

/**
 * En-tête commun aux exports PDF et Excel.
 *
 * Les valeurs par défaut évitent un en-tête troué tant que la page
 * « الإعدادات » n'a pas été renseignée.
 */
export async function getReportSettings(
  client?: ReportClient,
): Promise<ReportSettings> {
  const supabase = client ?? (await createClient());
  const { data } = await supabase
    .from("settings")
    .select("party_name, territorial_community, logo_url")
    .limit(1)
    .maybeSingle();

  return {
    partyName: data?.party_name?.trim() || "الحزب",
    territorialCommunity: data?.territorial_community?.trim() || "جماعة ترابية",
    logoUrl: data?.logo_url ?? null,
  };
}

/**
 * Cadre + tous ses électeurs, dans l'ordre de رقم الترتيب.
 *
 * Volontairement non paginé : un export doit être exhaustif. Le RLS s'applique
 * normalement, donc un utilisateur ne peut exporter que son périmètre.
 */
export async function getCadreReport(
  cadreId: string,
): Promise<CadreReport | null> {
  const supabase = await createClient();

  const { data: cadre } = await supabase
    .from("cadres")
    .select("*")
    .eq("id", cadreId)
    .maybeSingle();
  if (!cadre) return null;

  const { data: electeurs } = await supabase
    .from("electeurs_ordered")
    .select("*")
    .eq("cadre_id", cadreId)
    .order("order_number", { ascending: true });

  return { cadre, electeurs: electeurs ?? [] };
}

/** Tous les cadres visibles, avec leurs électeurs — une feuille Excel chacun. */
export async function getAllCadreReports(
  client?: ReportClient,
): Promise<CadreReport[]> {
  const supabase = client ?? (await createClient());

  const { data: cadres } = await supabase
    .from("cadres")
    .select("*")
    .order("full_name", { ascending: true });
  if (!cadres?.length) return [];

  const { data: electeurs } = await supabase
    .from("electeurs_ordered")
    .select("*")
    .order("order_number", { ascending: true });

  // Un seul aller-retour pour tous les électeurs, puis regroupement en
  // mémoire : une requête par cadre multiplierait les allers-retours réseau.
  const parCadre = new Map<string, ElecteurWithOrder[]>();
  for (const electeur of electeurs ?? []) {
    const liste = parCadre.get(electeur.cadre_id);
    if (liste) liste.push(electeur);
    else parCadre.set(electeur.cadre_id, [electeur]);
  }

  return cadres.map((cadre) => ({
    cadre,
    electeurs: parCadre.get(cadre.id) ?? [],
  }));
}

/**
 * Télécharge le logo et le renvoie en base64.
 *
 * Chromium n'a pas accès au réseau de manière fiable pendant le rendu, et
 * ExcelJS exige de toute façon les octets de l'image. Un logo indisponible ne
 * doit jamais faire échouer l'export : on renvoie `null` et l'en-tête s'en
 * passe.
 */
export async function fetchLogo(
  logoUrl: string | null,
): Promise<{ base64: string; extension: "png" | "jpeg" } | null> {
  if (!logoUrl) return null;

  try {
    const response = await fetch(logoUrl, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") ?? "";
    const extension = contentType.includes("jpeg") ? "jpeg" : "png";
    const buffer = Buffer.from(await response.arrayBuffer());
    return { base64: buffer.toString("base64"), extension };
  } catch {
    return null;
  }
}
