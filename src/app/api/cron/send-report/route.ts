import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { getCronSecret } from "@/lib/env";
import { getReportSchedule } from "@/lib/data/settings";
import { isReportDue } from "@/lib/reports/schedule";
import { sendFullReport } from "@/lib/reports/send";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Rien ne doit être mis en cache ici : une réponse mémorisée ferait croire au
 * planificateur que le rapport est parti alors qu'aucun code ne s'est exécuté.
 */
export const dynamic = "force-dynamic";

/** Comparaison à durée constante, pour ne pas divulguer le secret par la mesure. */
function secretMatches(header: string | null, secret: string): boolean {
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header ?? "");
  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  );
}

/**
 * Envoi automatique du rapport Excel — déclenché par le planificateur Vercel.
 *
 * Déclenchée tous les jours à 05:00 UTC (06:00 au Maroc) : c'est cette route,
 * et non le planificateur, qui décide si l'envoi est dû. Confier la périodicité
 * au `schedule` de vercel.json aurait obligé à redéployer à chaque changement
 * de fréquence dans les réglages.
 *
 * S'exécute sans session : les données passent par le client administrateur,
 * seul capable de lire l'ensemble des cadres hors RLS.
 */
export async function GET(request: Request) {
  const secret = getCronSecret();

  // Une variable absente ne vaut jamais autorisation : sans ce refus, oublier
  // CRON_SECRET exposerait publiquement l'export complet de la base.
  if (!secret) {
    console.error("[cron] CRON_SECRET absente : requête refusée");
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }

  if (!secretMatches(request.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const schedule = await getReportSchedule(admin);

  if (!schedule) {
    console.error("[cron] ligne settings introuvable");
    return NextResponse.json(
      { error: "settings introuvables" },
      { status: 500 },
    );
  }

  const decision = isReportDue(schedule);
  if (!decision.due || !schedule.email) {
    const reason = decision.reason;
    console.log(`[cron] aucun envoi : ${reason}`);
    return NextResponse.json({ sent: false, reason });
  }

  const outcome = await sendFullReport({ to: schedule.email, client: admin });

  if (!outcome.ok) {
    console.error(`[cron] envoi échoué : ${outcome.detail ?? outcome.error}`);
    // 500 volontaire : Vercel marque l'exécution en échec, ce qui rend le
    // problème visible dans le tableau de bord au lieu de le noyer dans les
    // journaux d'une exécution « réussie ».
    return NextResponse.json(
      { sent: false, error: outcome.error },
      { status: 500 },
    );
  }

  // Horodaté après le succès seulement : marquer avant ferait sauter l'envoi
  // du lendemain alors qu'aucun rapport n'est jamais parti.
  const sentAt = new Date().toISOString();
  const { error } = await admin
    .from("settings")
    .update({ last_report_sent_at: sentAt })
    .eq("id", schedule.id);

  if (error) {
    // L'e-mail est parti : l'échec de l'horodatage ne rend pas l'exécution
    // fausse, mais il ferait renvoyer un rapport identique demain.
    console.error(`[cron] horodatage non enregistré : ${error.message}`);
  }

  await admin.from("audit_logs").insert({
    // Aucune session : la trace est écrite sans auteur, ce qu'autorise la
    // colonne. Le journal affiche « النظام » pour ces lignes — c'est le seul
    // chemin qui produise un `user_id` nul.
    user_id: null,
    action: "email",
    entity_type: "report",
    entity_id: null,
  });

  console.log(`[cron] rapport envoyé à ${outcome.recipient} (${sentAt})`);
  return NextResponse.json({
    sent: true,
    recipient: outcome.recipient,
    sentAt,
  });
}
