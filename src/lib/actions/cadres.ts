"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { logAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { cadreCinExists } from "@/lib/data/cadres";
import { createClient } from "@/lib/supabase/server";
import { normalizeCin } from "@/lib/utils";

export type CadreFormState = {
  error?: string;
  fieldErrors?: Partial<Record<CadreField, string>>;
  values?: Record<CadreField, string>;
} | null;

type CadreField =
  "cin" | "full_name" | "phone" | "polling_station_number" | "polling_location";

const REQUIRED_FIELDS: { name: CadreField; label: string }[] = [
  { name: "cin", label: "رقم البطاقة الوطنية" },
  { name: "full_name", label: "الاسم الكامل" },
  { name: "polling_station_number", label: "رقم مكتب التصويت" },
  { name: "polling_location", label: "مكان التصويت" },
];

function readForm(formData: FormData): Record<CadreField, string> {
  return {
    cin: String(formData.get("cin") ?? "").trim(),
    full_name: String(formData.get("full_name") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    polling_station_number: String(
      formData.get("polling_station_number") ?? "",
    ).trim(),
    polling_location: String(formData.get("polling_location") ?? "").trim(),
  };
}

function validate(
  values: Record<CadreField, string>,
): Partial<Record<CadreField, string>> {
  const fieldErrors: Partial<Record<CadreField, string>> = {};
  for (const { name, label } of REQUIRED_FIELDS) {
    if (!values[name]) fieldErrors[name] = `${label} مطلوب`;
  }
  return fieldErrors;
}

/**
 * Traduit une erreur PostgreSQL en message arabe.
 *
 * `23505` (violation d'unicité) est le verdict final sur le CIN : la
 * vérification en cours de saisie peut avoir été contournée, ou deux
 * utilisateurs peuvent avoir soumis le même CIN simultanément.
 */
function arabicDbError(code: string | undefined): string {
  switch (code) {
    case "23505":
      return "هذا الرقم الوطني مسجل مسبقاً لمؤطر آخر";
    case "23503":
      return "لا يمكن حذف مؤطر مرتبط بناخبين. احذف ناخبيه أو انقلهم أولاً";
    case "42501":
      return "لا تملك صلاحية تنفيذ هذه العملية";
    default:
      return "تعذّر حفظ البيانات. حاول مرة أخرى";
  }
}

export async function createCadre(
  _prevState: CadreFormState,
  formData: FormData,
): Promise<CadreFormState> {
  await requireUser();
  const values = readForm(formData);

  const fieldErrors = validate(values);
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors, values };

  if (await cadreCinExists(normalizeCin(values.cin))) {
    return {
      fieldErrors: { cin: "هذا الرقم الوطني مسجل مسبقاً لمؤطر آخر" },
      values,
    };
  }

  // Identifiant décidé ici plutôt que réclamé en `RETURNING` : une insertion
  // sans clause de retour épargne un aller-retour, et l'identifiant est de
  // toute façon nécessaire pour journaliser puis rediriger.
  const id = randomUUID();

  const supabase = await createClient();
  const { error } = await supabase.from("cadres").insert({
    id,
    cin: values.cin,
    full_name: values.full_name,
    phone: values.phone || null,
    polling_station_number: values.polling_station_number,
    polling_location: values.polling_location,
  });

  if (error) {
    return error.code === "23505"
      ? { fieldErrors: { cin: arabicDbError(error.code) }, values }
      : { error: arabicDbError(error.code), values };
  }

  await logAudit("create", "cadre", id);
  revalidatePath("/cadres");
  redirect(`/cadres/${id}`);
}

export async function updateCadre(
  id: string,
  _prevState: CadreFormState,
  formData: FormData,
): Promise<CadreFormState> {
  await requireUser();
  const values = readForm(formData);

  const fieldErrors = validate(values);
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors, values };

  // L'unicité s'applique aussi en modification, en s'excluant soi-même.
  if (await cadreCinExists(normalizeCin(values.cin), id)) {
    return {
      fieldErrors: { cin: "هذا الرقم الوطني مسجل مسبقاً لمؤطر آخر" },
      values,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cadres")
    .update({
      cin: values.cin,
      full_name: values.full_name,
      phone: values.phone || null,
      polling_station_number: values.polling_station_number,
      polling_location: values.polling_location,
    })
    .eq("id", id)
    .select("id");

  if (error) {
    return error.code === "23505"
      ? { fieldErrors: { cin: arabicDbError(error.code) }, values }
      : { error: arabicDbError(error.code), values };
  }

  // Le RLS ne renvoie pas d'erreur sur un UPDATE hors périmètre : il ne
  // modifie simplement aucune ligne.
  if (!data || data.length === 0) {
    return { error: "لا تملك صلاحية تعديل هذا المؤطر", values };
  }

  await logAudit("update", "cadre", id);
  revalidatePath("/cadres");
  revalidatePath(`/cadres/${id}`);
  redirect(`/cadres/${id}`);
}

export type DeleteCadreState = { error: string } | null;

export async function deleteCadre(
  id: string,
  _prevState: DeleteCadreState,
): Promise<DeleteCadreState> {
  await requireUser();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cadres")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) return { error: arabicDbError(error.code) };
  if (!data || data.length === 0) {
    return { error: "لا تملك صلاحية حذف هذا المؤطر" };
  }

  await logAudit("delete", "cadre", id);
  revalidatePath("/cadres");
  redirect("/cadres");
}

/** Vérification du CIN pendant la saisie (anti-rebond côté client). */
export async function checkCadreCin(
  cin: string,
  excludeId?: string,
): Promise<{ taken: boolean }> {
  await requireUser();
  const normalized = normalizeCin(cin);
  if (!normalized) return { taken: false };
  return { taken: await cadreCinExists(normalized, excludeId) };
}
