"use server";

import { logAudit } from "@/lib/audit";
import { getSessionUser } from "@/lib/auth";
import { sendFullReport } from "@/lib/reports/send";
import { createClient } from "@/lib/supabase/server";

export type SendReportState = {
  error?: string;
  success?: string;
} | null;

/**
 * Envoi manuel du rapport Excel complet, déclenché depuis « التقارير ».
 *
 * Réservé au super_admin, comme le téléchargement Excel : le rôle « saisie » ne
 * doit pas pouvoir faire sortir la base entière de l'application, et l'envoyer
 * par e-mail la ferait sortir plus loin encore qu'un téléchargement.
 *
 * Le destinataire vient des réglages et n'est pas saisissable ici : un champ
 * libre au moment de l'envoi ferait de ce bouton un moyen d'expédier le fichier
 * à n'importe quelle adresse, sans trace dans la configuration.
 */
export async function sendReportNow(
  _prevState: SendReportState,
): Promise<SendReportState> {
  const user = await getSessionUser();
  if (!user) return { error: "انتهت الجلسة. أعد تسجيل الدخول" };
  if (user.role !== "super_admin") {
    return { error: "لا تملك صلاحية إرسال التقرير" };
  }

  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("settings")
    .select("id, report_email")
    .limit(1)
    .maybeSingle();

  const recipient = settings?.report_email?.trim();
  if (!recipient) {
    return {
      error: "لم يُحدَّد عنوان المُستقبِل. أضفه في الإعدادات ثم أعد المحاولة",
    };
  }

  const outcome = await sendFullReport({ to: recipient });

  if (!outcome.ok) {
    if (outcome.detail) {
      console.error("[rapport] envoi manuel échoué :", outcome.detail);
    }
    return { error: outcome.error };
  }

  // Même horodatage que l'envoi automatique : un rapport envoyé à la main le
  // matin rend inutile celui de la planification du jour.
  if (settings?.id) {
    await supabase
      .from("settings")
      .update({ last_report_sent_at: new Date().toISOString() })
      .eq("id", settings.id);
  }

  await logAudit("email", "report", null);

  return { success: `تم إرسال التقرير إلى ${outcome.recipient}` };
}
