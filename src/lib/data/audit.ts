import "server-only";

import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { Paginated } from "@/types";

export type AuditEntry = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
  /** `null` si le compte a été supprimé — la trace, elle, reste. */
  userName: string | null;
};

/**
 * Journal des opérations, du plus récent au plus ancien.
 *
 * Lisible par le seul super_admin (policy `audit_logs_select`). La table est
 * append-only : ni l'application ni un super_admin ne peuvent en effacer une
 * ligne.
 */
export async function listAuditLogs({
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  action,
  entityType,
}: {
  page?: number;
  pageSize?: number;
  action?: string;
  entityType?: string;
}): Promise<Paginated<AuditEntry>> {
  const supabase = await createClient();

  let query = supabase
    .from("audit_logs")
    .select(
      "id, action, entity_type, entity_id, created_at, profiles(full_name)",
      {
        count: "exact",
      },
    )
    .order("created_at", { ascending: false })
    // `created_at` peut être identique sur des écritures groupées ; `id`
    // départage pour que la pagination reste stable.
    .order("id", { ascending: false });

  if (action) query = query.eq("action", action);
  if (entityType) query = query.eq("entity_type", entityType);

  const safePage = Math.max(1, Math.trunc(page));
  const from = (safePage - 1) * pageSize;

  const { data, count, error } = await query.range(from, from + pageSize - 1);
  if (error)
    throw new Error(`Lecture du journal impossible : ${error.message}`);

  return {
    rows: (data ?? []).map((row) => ({
      id: row.id,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      createdAt: row.created_at,
      userName: row.profiles?.full_name ?? null,
    })),
    total: count ?? 0,
    page: safePage,
    pageSize,
  };
}
