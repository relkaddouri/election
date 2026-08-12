import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSecretKey, publicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Client Supabase pour les Composants Serveur, Server Actions et Route
 * Handlers. Soumis au RLS avec la session de l'utilisateur connecté.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    publicEnv.supabaseUrl,
    publicEnv.supabasePublishableKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Appelé depuis un Composant Serveur : l'écriture de cookies y est
            // interdite. Le rafraîchissement de session est pris en charge par
            // `src/proxy.ts`, cette erreur peut donc être ignorée.
          }
        },
      },
    },
  );
}

/**
 * Client administrateur : contourne le RLS.
 *
 * À réserver aux opérations qui ne peuvent pas passer par le RLS (création
 * d'utilisateurs par le super_admin, tâches de maintenance). Ne jamais
 * l'exposer à une entrée utilisateur non vérifiée, et ne jamais l'importer
 * depuis un Composant Client.
 */
export function createAdminClient() {
  return createServerClient<Database>(publicEnv.supabaseUrl, getSecretKey(), {
    cookies: {
      getAll() {
        return [];
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
