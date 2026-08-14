import "server-only";

import { cache } from "react";

import { DEFAULT_PRIMARY_COLOR } from "@/lib/constants";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export type Branding = {
  partyName: string | null;
  logoUrl: string | null;
  /** Toujours renseignée : la valeur par défaut prend le relais. */
  primaryColor: string;
};

const FALLBACK: Branding = {
  partyName: null,
  logoUrl: null,
  primaryColor: DEFAULT_PRIMARY_COLOR,
};

/** Seule forme acceptée par `<input type="color">` et par la feuille de style. */
const HEX = /^#[0-9a-fA-F]{6}$/;

/**
 * Habillage de l'application : nom du parti, logo, couleur d'accent.
 *
 * Lu par le layout racine, donc sur **toutes** les pages, y compris la
 * connexion. `cache()` mémorise le résultat pour la durée d'un rendu : le
 * layout et la page de connexion peuvent l'appeler tous les deux sans doubler
 * la requête.
 *
 * Ne demande que les colonnes ouvertes au rôle `anon` — un `select("*")`
 * échouerait faute de droit sur `territorial_community`.
 *
 * Ne lève jamais : un habillage indisponible ne doit pas empêcher de se
 * connecter.
 */
export const getBranding = cache(async (): Promise<Branding> => {
  if (!isSupabaseConfigured) return FALLBACK;

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("settings")
      .select("party_name, logo_url, primary_color")
      .limit(1)
      .maybeSingle();

    if (!data) return FALLBACK;

    // La contrainte en base garantit déjà le format ; on revalide ici parce
    // que la valeur part directement dans un attribut `style`.
    const color = data.primary_color?.trim();

    return {
      partyName: data.party_name?.trim() || null,
      logoUrl: data.logo_url ?? null,
      primaryColor: color && HEX.test(color) ? color : DEFAULT_PRIMARY_COLOR,
    };
  } catch {
    return FALLBACK;
  }
});
