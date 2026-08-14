import "server-only";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import { emailToUsername } from "@/lib/username";
import type { Profile, UserRole } from "@/types";

export type ManagedUser = Profile & {
  /** Identifiant de connexion. L'e-mail technique n'est jamais exposé. */
  username: string;
};

/**
 * Utilisateurs de l'application.
 *
 * L'identifiant de connexion vit dans `auth.users.email`, hors de portée du RLS
 * et de PostgREST : il est récupéré via l'API d'administration, puis réduit à
 * sa partie locale. Le reste passe par le client normal, donc par le RLS.
 */
export async function listUsers(): Promise<ManagedUser[]> {
  const supabase = await createClient();

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("*")
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

  return (profiles ?? []).map((profile) => ({
    ...profile,
    username: emailToUsername(emails.get(profile.id) ?? null),
  }));
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
