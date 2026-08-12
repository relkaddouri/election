"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { logAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { ELECTEUR_DUPLICATE_MESSAGE } from "@/lib/constants";
import { findElecteurCinOwner } from "@/lib/data/electeurs";
import { createClient } from "@/lib/supabase/server";
import { normalizeCin } from "@/lib/utils";
import type { DuplicateCadre } from "@/types";

type ElecteurField =
  | "cin"
  | "full_name"
  | "phone"
  | "polling_station_number"
  | "polling_location"
  | "cadre_id";

export type ElecteurFormState = {
  error?: string;
  fieldErrors?: Partial<Record<ElecteurField, string>>;
  /** Cadre détenteur, pour afficher « … مسجل مسبقاً » avec son nom. */
  duplicate?: DuplicateCadre;
  values?: Record<ElecteurField, string>;
} | null;

/** Tous les champs de l'électeur sont obligatoires. */
const REQUIRED_FIELDS: { name: ElecteurField; label: string }[] = [
  { name: "cin", label: "رقم البطاقة الوطنية" },
  { name: "full_name", label: "الاسم الكامل" },
  { name: "phone", label: "رقم الهاتف" },
  { name: "polling_station_number", label: "رقم مكتب التصويت" },
  { name: "polling_location", label: "مكان التصويت" },
  { name: "cadre_id", label: "المؤطر" },
];

function readForm(formData: FormData): Record<ElecteurField, string> {
  const get = (key: ElecteurField) => String(formData.get(key) ?? "").trim();
  return {
    cin: get("cin"),
    full_name: get("full_name"),
    phone: get("phone"),
    polling_station_number: get("polling_station_number"),
    polling_location: get("polling_location"),
    cadre_id: get("cadre_id"),
  };
}

function validate(
  values: Record<ElecteurField, string>,
): Partial<Record<ElecteurField, string>> {
  const fieldErrors: Partial<Record<ElecteurField, string>> = {};
  for (const { name, label } of REQUIRED_FIELDS) {
    if (!values[name]) fieldErrors[name] = `${label} مطلوب`;
  }
  return fieldErrors;
}

function arabicDbError(code: string | undefined): string {
  switch (code) {
    case "23505":
      return ELECTEUR_DUPLICATE_MESSAGE;
    case "23503":
      return "المؤطر المحدد غير موجود";
    case "23502":
    case "23514":
      // NOT NULL / CHECK : atteint uniquement si la validation applicative a
      // été contournée, ou si la saisie ne contenait que des espaces (le
      // trigger de normalisation les réduit alors à NULL).
      return "يرجى ملء جميع الحقول الإجبارية";
    case "42501":
      return "لا تملك صلاحية تنفيذ هذه العملية";
    default:
      return "تعذّر حفظ البيانات. حاول مرة أخرى";
  }
}

/**
 * En cas de violation d'unicité renvoyée par PostgreSQL, retrouve le cadre
 * détenteur pour que le message reste aussi précis que celui affiché pendant
 * la saisie.
 */
async function duplicateState(
  values: Record<ElecteurField, string>,
  excludeId?: string,
): Promise<ElecteurFormState> {
  const owner = await findElecteurCinOwner(normalizeCin(values.cin), excludeId);
  return {
    duplicate: owner ?? undefined,
    fieldErrors: { cin: ELECTEUR_DUPLICATE_MESSAGE },
    values,
  };
}

function payload(values: Record<ElecteurField, string>) {
  return {
    cadre_id: values.cadre_id,
    cin: values.cin,
    full_name: values.full_name,
    phone: values.phone,
    polling_station_number: values.polling_station_number,
    polling_location: values.polling_location,
  };
}

export async function createElecteur(
  _prevState: ElecteurFormState,
  formData: FormData,
): Promise<ElecteurFormState> {
  await requireUser();
  const values = readForm(formData);

  const fieldErrors = validate(values);
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors, values };

  // Contrôle applicatif : confort de saisie, pas garantie.
  const owner = await findElecteurCinOwner(normalizeCin(values.cin));
  if (owner) return duplicateState(values);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("electeurs")
    .insert(payload(values))
    .select("id")
    .single();

  if (error) {
    // Verdict final. On arrive ici si le contrôle ci-dessus a été contourné,
    // ou si deux saisies concurrentes ont passé le contrôle en même temps.
    if (error.code === "23505") return duplicateState(values);
    return { error: arabicDbError(error.code), values };
  }

  await logAudit("create", "electeur", data.id);
  revalidatePath("/electeurs");
  revalidatePath(`/cadres/${values.cadre_id}`);
  redirect(`/electeurs?cadre=${values.cadre_id}`);
}

export async function updateElecteur(
  id: string,
  _prevState: ElecteurFormState,
  formData: FormData,
): Promise<ElecteurFormState> {
  await requireUser();
  const values = readForm(formData);

  const fieldErrors = validate(values);
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors, values };

  // L'unicité s'applique aussi en modification, en s'excluant soi-même :
  // sans `excludeId`, ré-enregistrer sans toucher au CIN serait refusé.
  const owner = await findElecteurCinOwner(normalizeCin(values.cin), id);
  if (owner) return duplicateState(values, id);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("electeurs")
    .update(payload(values))
    .eq("id", id)
    .select("id");

  if (error) {
    if (error.code === "23505") return duplicateState(values, id);
    return { error: arabicDbError(error.code), values };
  }

  // Un UPDATE hors périmètre RLS ne lève pas d'erreur : il ne touche
  // simplement aucune ligne.
  if (!data || data.length === 0) {
    return { error: "لا تملك صلاحية تعديل هذا الناخب", values };
  }

  await logAudit("update", "electeur", id);
  revalidatePath("/electeurs");
  revalidatePath(`/cadres/${values.cadre_id}`);
  redirect(`/electeurs?cadre=${values.cadre_id}`);
}

export type DeleteElecteurState = { error: string } | null;

export async function deleteElecteur(
  id: string,
  _prevState: DeleteElecteurState,
): Promise<DeleteElecteurState> {
  await requireUser();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("electeurs")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) return { error: arabicDbError(error.code) };
  if (!data || data.length === 0) {
    return { error: "لا تملك صلاحية حذف هذا الناخب" };
  }

  await logAudit("delete", "electeur", id);
  revalidatePath("/electeurs");
  redirect("/electeurs");
}

/** Vérification du CIN pendant la saisie (anti-rebond ~400 ms côté client). */
export async function checkElecteurCin(
  cin: string,
  excludeId?: string,
): Promise<{ duplicate: DuplicateCadre | null }> {
  await requireUser();
  const normalized = normalizeCin(cin);
  if (!normalized) return { duplicate: null };
  return { duplicate: await findElecteurCinOwner(normalized, excludeId) };
}
