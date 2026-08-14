"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { APP_SCROLL_ID } from "@/lib/scroll-lock";

/**
 * Remet le contenu en haut lors d'une navigation.
 *
 * Next.js remonte la fenêtre après un changement de route, mais la fenêtre ne
 * défile plus : le défilement appartient à `<main>`. Sans ce composant, ouvrir
 * une page depuis le bas d'une longue liste laisserait la nouvelle page
 * affichée en son milieu.
 *
 * Réagit aussi au numéro de page : passer à la page suivante d'une liste doit
 * ramener en haut. Les autres paramètres — recherche, filtres — sont
 * volontairement ignorés, l'utilisateur y affine ses critères sans vouloir
 * perdre sa position.
 */
export function ScrollReset() {
  const pathname = usePathname();
  const page = useSearchParams().get("page");

  useEffect(() => {
    document.getElementById(APP_SCROLL_ID)?.scrollTo({ top: 0 });
  }, [pathname, page]);

  return null;
}
