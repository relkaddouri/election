import "server-only";

import { createClient } from "@/lib/supabase/server";

export type CadreShare = {
  id: string;
  fullName: string;
  count: number;
  /** Part du total, en pourcentage. 0 si aucun électeur en base. */
  share: number;
};

export type DashboardStats = {
  totalElecteurs: number;
  totalCadres: number;
  totalUtilisateurs: number;
  /** Cadres triés par nombre d'électeurs décroissant. */
  distribution: CadreShare[];
};

/**
 * Statistiques du tableau de bord.
 *
 * Les totaux passent par `head: true` : PostgREST ne renvoie alors que
 * l'en-tête de comptage, sans transférer une seule ligne. Compter côté client
 * imposerait de rapatrier des milliers d'électeurs pour n'en afficher que la
 * longueur.
 *
 * Toutes les requêtes restent soumises au RLS : les chiffres sont ceux du
 * périmètre de l'utilisateur, pas des totaux privilégiés.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient();

  const [electeurs, cadres, utilisateurs, parCadre] = await Promise.all([
    supabase.from("electeurs").select("*", { count: "exact", head: true }),
    supabase.from("cadres").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase
      .from("cadres_with_counts")
      .select("id, full_name, electeurs_count")
      .order("electeurs_count", { ascending: false })
      // Départage stable : sans lui, deux cadres à égalité pourraient
      // permuter d'un rendu à l'autre.
      .order("full_name", { ascending: true }),
  ]);

  const totalElecteurs = electeurs.count ?? 0;

  const distribution: CadreShare[] = (parCadre.data ?? []).map((cadre) => ({
    id: cadre.id,
    fullName: cadre.full_name,
    count: cadre.electeurs_count,
    share:
      totalElecteurs > 0 ? (cadre.electeurs_count / totalElecteurs) * 100 : 0,
  }));

  return {
    totalElecteurs,
    totalCadres: cadres.count ?? 0,
    totalUtilisateurs: utilisateurs.count ?? 0,
    distribution,
  };
}
