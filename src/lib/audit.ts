import "server-only";

import { createClient } from "@/lib/supabase/server";

export type AuditAction = "create" | "update" | "delete" | "login" | "export";

export type AuditEntity = "cadre" | "electeur" | "user" | "settings";

/**
 * Journalise une opération dans « سجل العمليات ».
 *
 * Écrit avec le client de l'utilisateur : la policy RLS impose
 * `user_id = auth.uid()`, ce qui rend impossible la journalisation sous
 * l'identité d'un tiers.
 *
 * Ne lève jamais : un échec d'écriture du journal ne doit pas annuler
 * l'opération métier qui vient de réussir.
 */
export async function logAudit(
  action: AuditAction,
  entityType: AuditEntity,
  entityId?: string | null,
): Promise<void> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action,
      entity_type: entityType,
      entity_id: entityId ?? null,
    });
  } catch {
    // Silencieux par conception — voir le commentaire ci-dessus.
  }
}
