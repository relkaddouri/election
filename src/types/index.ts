import type { Database, Tables, UserRole } from "@/types/database";

export type { Database, Json, UserRole } from "@/types/database";
export type { Tables, TablesInsert, TablesUpdate } from "@/types/database";

/** Alias métier — évitent `Tables<"...">` dispersé dans les composants. */
export type Profile = Tables<"profiles">;
export type Cadre = Tables<"cadres">;
export type Electeur = Tables<"electeurs">;
export type Settings = Tables<"settings">;
export type AuditLog = Tables<"audit_logs">;
export type UserCadre = Tables<"user_cadres">;

/**
 * Cadre enrichi du nombre d'électeurs.
 *
 * Vient de la vue `cadres_with_counts` : le compte est toujours dérivé d'un
 * COUNT, jamais stocké, donc jamais désynchronisable.
 */
export type CadreWithCount =
  Database["public"]["Views"]["cadres_with_counts"]["Row"];

/** Électeur accompagné du cadre dont il dépend. */
export type ElecteurWithCadre = Electeur & {
  cadre: Pick<Cadre, "id" | "full_name"> | null;
};

/** Utilisateur connecté, tel que consommé par l'UI. */
export type SessionUser = {
  id: string;
  email: string | null;
  fullName: string;
  role: UserRole;
  isActive: boolean;
};

/** Résultat paginé générique (listes d'électeurs de plusieurs milliers). */
export type Paginated<T> = {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
};
