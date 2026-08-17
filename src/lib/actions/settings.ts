"use server";

import { revalidatePath } from "next/cache";

import { logAudit } from "@/lib/audit";
import { getSessionUser } from "@/lib/auth";
import {
  MAX_INACTIVITY_TIMEOUT_MINUTES,
  MIN_INACTIVITY_TIMEOUT_MINUTES,
  REPORT_FREQUENCY_LABELS,
} from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { ReportFrequency } from "@/types";

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

/**
 * Contrôle volontairement permissif : une adresse doit comporter un `@`, un
 * domaine et pas d'espace. Valider finement une adresse en expression
 * rationnelle est un piège connu — c'est l'acheminement qui tranche.
 */
const EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

type ReportSchedule = {
  report_email: string | null;
  report_frequency: ReportFrequency;
  report_weekday: number | null;
  report_day_of_month: number | null;
  report_enabled: boolean;
};

/**
 * Lit et valide la planification d'envoi soumise par le formulaire.
 *
 * Renvoie un message arabe plutôt qu'un objet en cas d'incohérence : ces règles
 * doublent les contraintes CHECK de la base, dont les messages d'erreur ne sont
 * pas montrables à un utilisateur.
 */
function readSchedule(formData: FormData): ReportSchedule | string {
  const email = String(formData.get("report_email") ?? "").trim();
  if (email && !EMAIL.test(email)) {
    return "عنوان البريد الإلكتروني غير صالح";
  }

  const frequency = String(formData.get("report_frequency") ?? "daily");
  if (!(frequency in REPORT_FREQUENCY_LABELS)) {
    return "وتيرة الإرسال غير صالحة";
  }

  // Une case décochée n'est pas envoyée : son absence vaut « désactivé ».
  const enabled = formData.get("report_enabled") != null;
  if (enabled && !email) {
    return "لا يمكن تفعيل الإرسال التلقائي بدون عنوان بريد إلكتروني";
  }

  // Les champs de jour n'existent dans le formulaire que pour la fréquence
  // correspondante : leur absence ailleurs remet la colonne à NULL, ce
  // qu'exige la contrainte de cohérence en base.
  let weekday: number | null = null;
  if (frequency === "weekly") {
    weekday = Number(formData.get("report_weekday"));
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
      return "يوم الأسبوع غير صالح";
    }
  }

  let dayOfMonth: number | null = null;
  if (frequency === "monthly") {
    dayOfMonth = Number(formData.get("report_day_of_month"));
    if (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) {
      return "يوم الشهر غير صالح";
    }
  }

  return {
    report_email: email || null,
    report_frequency: frequency as ReportFrequency,
    report_weekday: weekday,
    report_day_of_month: dayOfMonth,
    report_enabled: enabled,
  };
}

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

  // `<input type="color">` ne peut produire qu'un `#rrggbb`. Une valeur vide
  // ou malformée est ramenée à NULL, ce qui rétablit la couleur par défaut
  // plutôt que de faire échouer l'enregistrement sur la contrainte en base.
  const rawColor = String(formData.get("primary_color") ?? "").trim();
  const primaryColor = /^#[0-9a-fA-F]{6}$/.test(rawColor) ? rawColor : null;

  // Refusé plutôt que ramené silencieusement à la valeur par défaut : un
  // super_admin qui tape « 30 minutes » doit être averti s'il s'est trompé,
  // pas découvrir plus tard que la session coupe au bout de 15.
  const rawTimeout = String(
    formData.get("inactivity_timeout_minutes") ?? "",
  ).trim();
  const timeoutMinutes = Number(rawTimeout);
  if (
    !Number.isInteger(timeoutMinutes) ||
    timeoutMinutes < MIN_INACTIVITY_TIMEOUT_MINUTES ||
    timeoutMinutes > MAX_INACTIVITY_TIMEOUT_MINUTES
  ) {
    return {
      error: `مدة الخمول يجب أن تكون عدداً بين ${MIN_INACTIVITY_TIMEOUT_MINUTES} و ${MAX_INACTIVITY_TIMEOUT_MINUTES} دقيقة`,
    };
  }

  const schedule = readSchedule(formData);
  if (typeof schedule === "string") return { error: schedule };

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
      primary_color: primaryColor,
      inactivity_timeout_minutes: timeoutMinutes,
      ...schedule,
    })
    .eq("id", current.id);

  if (error) {
    return error.code === "42501"
      ? { error: "لا تملك صلاحية تعديل الإعدادات" }
      : { error: "تعذّر حفظ الإعدادات. حاول مرة أخرى" };
  }

  await logAudit("update", "settings", current.id);
  // Portée « layout » depuis la racine : ces réglages sont consommés par les
  // layouts (couleur et logo par la racine, délai d'inactivité par celui des
  // pages authentifiées), pas seulement par la page des paramètres. Sans cela,
  // le cache de routeur du navigateur garderait l'ancienne valeur.
  revalidatePath("/", "layout");
  return { success: true };
}
