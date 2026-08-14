import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types";

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
  /** `null` quand le rôle n'a pas à connaître ce chiffre — il n'est alors
   *  pas non plus demandé à la base. */
  totalUtilisateurs: number | null;
  /** Cadres triés par nombre d'électeurs décroissant. */
  distribution: CadreShare[];
};

/**
 * Le nombre d'utilisateurs n'est destiné qu'au super_admin.
 *
 * Exporté pour que la page et la couche données s'appuient sur la même règle :
 * masquer la carte sans écarter la requête laisserait une donnée non désirée
 * transiter à chaque affichage.
 */
export function canSeeUserCount(role: UserRole): boolean {
  return role === "super_admin";
}

/**
 * Statistiques du tableau de bord.
 *
 * Les totaux passent par `head: true` : PostgREST ne renvoie alors que
 * l'en-tête de comptage, sans transférer une seule ligne. Compter côté client
 * imposerait de rapatrier des milliers d'électeurs pour n'en afficher que la
 * longueur.
 *
 * Toutes les requêtes restent soumises au RLS : un utilisateur « saisie » voit
 * les chiffres de son périmètre, pas des totaux privilégiés.
 */
export async function getDashboardStats(
  role: UserRole,
): Promise<DashboardStats> {
  const supabase = await createClient();

  const includeUserCount = canSeeUserCount(role);

  const [electeurs, cadres, utilisateurs, parCadre] = await Promise.all([
    supabase.from("electeurs").select("*", { count: "exact", head: true }),
    supabase.from("cadres").select("*", { count: "exact", head: true }),
    // La requête n'est pas seulement ignorée à l'affichage : elle n'est pas
    // émise du tout pour les rôles qui n'y ont pas droit.
    includeUserCount
      ? supabase.from("profiles").select("*", { count: "exact", head: true })
      : Promise.resolve(null),
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
    totalUtilisateurs: utilisateurs ? (utilisateurs.count ?? 0) : null,
    distribution,
  };
}
