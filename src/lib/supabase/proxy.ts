import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { PUBLIC_ROUTES } from "@/lib/constants";
import { isSupabaseConfigured, publicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

function isPublic(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

/**
 * Les routes d'API ne doivent jamais être redirigées vers la page de connexion.
 *
 * Un client qui appelle `/api/...` sans session recevrait alors le HTML de
 * `/login` en 200 — trompeur pour l'appelant, et impossible à distinguer d'un
 * succès. Elles sont laissées passer pour que leur handler réponde lui-même un
 * 401 JSON ; chacune vérifie la session de son côté.
 */
function isApiRoute(pathname: string): boolean {
  return pathname === "/api" || pathname.startsWith("/api/");
}

/**
 * Rafraîchit le jeton de session Supabase, puis arbitre l'accès :
 * visiteur anonyme → page de connexion, utilisateur connecté sur /login →
 * son écran d'accueil.
 *
 * Le contrôle **par rôle** n'est volontairement pas fait ici : il exigerait
 * une requête sur `profiles` à chaque navigation, et la doc Next.js déconseille
 * de faire dépendre le proxy de modules partagés. Il est assuré par
 * `requireRole()` dans chaque page réservée, et par le RLS côté base.
 *
 * Appelé depuis `src/proxy.ts` (ex-`middleware.ts`, renommé dans Next.js 16).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Tant que .env.local n'est pas renseigné, on laisse passer la requête au
  // lieu de renvoyer une 500 sur chaque page.
  if (!isSupabaseConfigured) {
    return response;
  }

  const supabase = createServerClient<Database>(
    publicEnv.supabaseUrl,
    publicEnv.supabasePublishableKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
          // Empêche la mise en cache par un CDN d'une réponse porteuse de
          // cookies d'authentification.
          for (const [key, headerValue] of Object.entries(headers)) {
            response.headers.set(key, headerValue);
          }
        },
      },
    },
  );

  // Doit être appelé avant que la réponse ne soit émise, sinon un
  // rafraîchissement de jeton tardif serait perdu.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  /** Conserve les cookies rafraîchis en cas de redirection. */
  const redirectTo = (pathname: string, search?: URLSearchParams) => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = search ? `?${search}` : "";
    const redirect = NextResponse.redirect(url);
    for (const cookie of response.cookies.getAll()) {
      redirect.cookies.set(cookie);
    }
    return redirect;
  };

  if (!user && !isPublic(pathname) && !isApiRoute(pathname)) {
    const search = new URLSearchParams();
    // Mémorise la destination pour y revenir après connexion.
    if (pathname !== "/") search.set("next", pathname);
    return redirectTo("/login", search);
  }

  if (user && pathname === "/login") {
    // La cible exacte dépend du rôle, que le proxy ne lit pas : `/` se charge
    // de réorienter un « saisie » vers son écran d'accueil.
    return redirectTo("/");
  }

  return response;
}
