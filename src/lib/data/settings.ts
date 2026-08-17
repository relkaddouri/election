import "server-only";

import { cache } from "react";

import {
  DEFAULT_INACTIVITY_TIMEOUT_MINUTES,
  MAX_INACTIVITY_TIMEOUT_MINUTES,
  MIN_INACTIVITY_TIMEOUT_MINUTES,
} from "@/lib/constants";
import { isSupabaseConfigured } from "@/lib/env";
import type { ReportClient } from "@/lib/reports/data";
import { createClient } from "@/lib/supabase/server";
import type { ReportFrequency } from "@/types";

/**
 * Délai d'inactivité configuré, en millisecondes.
 *
 * Lecture distincte de `getBranding()` : `inactivity_timeout_minutes` n'est pas
 * ouverte au rôle `anon`, et l'ajouter au `select` de l'habillage ferait échouer
 * la requête (42501) sur la page de connexion, donc disparaître le logo.
 *
 * Ne lève jamais : un délai illisible doit retomber sur la valeur par défaut,
 * pas empêcher l'affichage des pages authentifiées.
 */
export const getInactivityTimeoutMs = cache(async (): Promise<number> => {
  const fallback = DEFAULT_INACTIVITY_TIMEOUT_MINUTES * 60 * 1000;
  if (!isSupabaseConfigured) return fallback;

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("settings")
      .select("inactivity_timeout_minutes")
      .limit(1)
      .maybeSingle();

    const minutes = data?.inactivity_timeout_minutes;

    // Les bornes sont déjà tenues par la contrainte CHECK ; revalidées ici
    // parce qu'une valeur aberrante couperait la session sans recours.
    if (
      typeof minutes !== "number" ||
      !Number.isFinite(minutes) ||
      minutes < MIN_INACTIVITY_TIMEOUT_MINUTES ||
      minutes > MAX_INACTIVITY_TIMEOUT_MINUTES
    ) {
      return fallback;
    }

    return minutes * 60 * 1000;
  } catch {
    return fallback;
  }
});

export type ReportSchedule = {
  /** Identifiant de la ligne unique — la tâche planifiée doit la mettre à jour. */
  id: string;
  email: string | null;
  frequency: ReportFrequency;
  weekday: number | null;
  dayOfMonth: number | null;
  enabled: boolean;
  lastSentAt: string | null;
};

/**
 * Planification de l'envoi du rapport.
 *
 * Lue par la page « التقارير » — qui n'a besoin que du destinataire — et par la
 * tâche planifiée, qui a besoin de tout. Un seul aller-retour dans les deux
 * cas ; la ligne `settings` compte moins de dix colonnes.
 */
export async function getReportSchedule(
  client?: ReportClient,
): Promise<ReportSchedule | null> {
  const supabase = client ?? (await createClient());
  const { data } = await supabase
    .from("settings")
    .select(
      "id, report_email, report_frequency, report_weekday, report_day_of_month, report_enabled, last_report_sent_at",
    )
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id,
    email: data.report_email?.trim() || null,
    frequency: data.report_frequency,
    weekday: data.report_weekday,
    dayOfMonth: data.report_day_of_month,
    enabled: data.report_enabled,
    lastSentAt: data.last_report_sent_at,
  };
}
