"use server";

import { revalidatePath } from "next/cache";

import { logAudit } from "@/lib/audit";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type SettingsFormState = {
  error?: string;
  success?: boolean;
} | null;

/**
 * Formats acceptés pour le logo.
 *
 * Restreint à PNG et JPEG : ce sont les seuls qu'ExcelJS sait insérer dans une
 * feuille. Accepter WebP ou SVG produirait un logo correct à l'écran mais
 * cassé dans l'export Excel — une incohérence invisible jusqu'au jour du
 * scrutin.
 */
const ACCEPTED_LOGO_TYPES = ["image/png", "image/jpeg"];
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

const BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ?? "public-assets";

export async function updateSettings(
  _prevState: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const user = await getSessionUser();
  if (!user) return { error: "انتهت الجلسة. أعد تسجيل الدخول" };
  if (user.role !== "super_admin") {
    return { error: "لا تملك صلاحية تعديل الإعدادات" };
  }

  const partyName = String(formData.get("party_name") ?? "").trim();
  const community = String(formData.get("territorial_community") ?? "").trim();
  const logo = formData.get("logo");

  const supabase = await createClient();

  // Une ligne unique, garantie par l'index `settings_singleton_idx`.
  const { data: current } = await supabase
    .from("settings")
    .select("id, logo_url")
    .limit(1)
    .maybeSingle();

  if (!current) return { error: "تعذّر العثور على الإعدادات" };

  let logoUrl = current.logo_url;

  if (logo instanceof File && logo.size > 0) {
    if (!ACCEPTED_LOGO_TYPES.includes(logo.type)) {
      return { error: "صيغة الصورة غير مدعومة. استعمل PNG أو JPEG" };
    }
    if (logo.size > MAX_LOGO_BYTES) {
      return { error: "حجم الصورة يتجاوز 2 ميغابايت" };
    }

    // Nom horodaté plutôt qu'un nom fixe : un chemin réutilisé resterait servi
    // depuis le cache du CDN, et l'ancien logo continuerait de s'afficher.
    const extension = logo.type === "image/jpeg" ? "jpg" : "png";
    const path = `logo-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, logo, { contentType: logo.type, upsert: false });

    if (uploadError) {
      return { error: `تعذّر رفع الصورة : ${uploadError.message}` };
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET).getPublicUrl(path);

    // Supprime le logo remplacé, sinon le bucket grossit indéfiniment.
    //
    // Restreint au motif `logo-<horodatage>.<ext>` produit ci-dessus : un
    // fichier déposé à la main dans le bucket ne doit pas disparaître parce
    // qu'il se trouvait référencé. Un échec est ignoré — perdre un fichier
    // orphelin est sans conséquence, échouer l'enregistrement en aurait une.
    const previous = current.logo_url?.split("/").pop();
    if (previous && /^logo-\d+\.(png|jpg)$/.test(previous)) {
      await supabase.storage.from(BUCKET).remove([previous]);
    }

    logoUrl = publicUrl;
  }

  const { error } = await supabase
    .from("settings")
    .update({
      party_name: partyName || null,
      territorial_community: community || null,
      logo_url: logoUrl,
    })
    .eq("id", current.id);

  if (error) {
    return error.code === "42501"
      ? { error: "لا تملك صلاحية تعديل الإعدادات" }
      : { error: "تعذّر حفظ الإعدادات. حاول مرة أخرى" };
  }

  await logAudit("update", "settings", current.id);
  revalidatePath("/parametres");
  return { success: true };
}
