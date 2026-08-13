import "server-only";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/types";

export type ManagedUser = Profile & {
  email: string | null;
  cadres: { id: string; full_name: string }[];
};

/**
 * Utilisateurs de l'application, avec leurs cadres affectés.
 *
 * L'adresse e-mail vit dans `auth.users`, hors de portée du RLS et de
 * PostgREST : elle est récupérée via l'API d'administration. Le reste passe par
 * le client normal, donc par le RLS.
 */
export async function listUsers(): Promise<ManagedUser[]> {
  const supabase = await createClient();

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("*, user_cadres(cadres(id, full_name))")
    .order("full_name", { ascending: true });

  if (error) {
    throw new Error(`Lecture des utilisateurs impossible : ${error.message}`);
  }

  // `listUsers` est paginé à 50 par défaut ; la borne haute couvre largement
  // une équipe de campagne.
  const admin = createAdminClient();
  const { data: authUsers } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  const emails = new Map(
    (authUsers?.users ?? []).map((u) => [u.id, u.email ?? null]),
  );

  return (profiles ?? []).map((profile) => {
    const { user_cadres, ...rest } = profile;
    return {
      ...rest,
      email: emails.get(profile.id) ?? null,
      cadres: (user_cadres ?? [])
        .map((link) => link.cadres)
        .filter((cadre): cadre is { id: string; full_name: string } =>
          Boolean(cadre),
        ),
    };
  });
}

/** Nombre de super_admin actifs — sert à empêcher la perte du dernier accès. */
export async function countActiveSuperAdmins(): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "super_admin")
    .eq("is_active", true);
  return count ?? 0;
}

export type { UserRole };
