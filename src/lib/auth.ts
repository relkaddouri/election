import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { ACCESS_DENIED_ROUTE } from "@/lib/constants";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { SessionUser, UserRole } from "@/types";

/**
 * Utilisateur connecté, ou `null`.
 *
 * `cache()` mémorise le résultat pour la durée d'un rendu : le layout et les
 * pages peuvent l'appeler librement sans multiplier les allers-retours.
 *
 * Un compte désactivé (`is_active = false`) est traité comme absent de session,
 * en cohérence avec le RLS qui lui refuse déjà tout accès aux données.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  if (!isSupabaseConfigured) return null;

  const supabase = await createClient();

  // `getUser()` et non `getSession()` : seul le premier revalide le jeton
  // auprès de Supabase. `getSession()` fait confiance au cookie, qui est
  // modifiable côté client.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !profile.is_active) return null;

  return {
    id: profile.id,
    email: user.email ?? null,
    fullName: profile.full_name,
    role: profile.role,
    isActive: profile.is_active,
  };
});

/** Impose une session ; renvoie vers la connexion sinon. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Impose une session ET un rôle autorisé.
 *
 * À appeler en tête de chaque page réservée. Le `proxy.ts` ne distingue que
 * connecté / non connecté ; c'est ici que se joue l'autorisation par rôle —
 * et le RLS reste de toute façon la barrière réelle sur les données.
 */
export async function requireRole(
  roles: readonly UserRole[],
): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect(ACCESS_DENIED_ROUTE);
  return user;
}
