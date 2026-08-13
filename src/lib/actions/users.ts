"use server";

import { revalidatePath } from "next/cache";

import { logAudit } from "@/lib/audit";
import { getSessionUser } from "@/lib/auth";
import { countActiveSuperAdmins } from "@/lib/data/users";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types";

export type UserFormState = {
  error?: string;
  success?: string;
} | null;

const ROLES: UserRole[] = ["super_admin", "saisie", "parlementaire"];
const MIN_PASSWORD_LENGTH = 10;

/**
 * Le client d'administration contourne le RLS : rien ne l'empêcherait de créer
 * un super_admin. Toute action qui l'utilise doit donc vérifier elle-même
 * l'appelant, ici et non ailleurs.
 */
async function requireSuperAdmin(): Promise<
  { ok: true; userId: string } | { ok: false; state: UserFormState }
> {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, state: { error: "انتهت الجلسة. أعد تسجيل الدخول" } };
  }
  if (user.role !== "super_admin") {
    return { ok: false, state: { error: "لا تملك صلاحية إدارة المستخدمين" } };
  }
  return { ok: true, userId: user.id };
}

function readRole(formData: FormData): UserRole | null {
  const value = String(formData.get("role") ?? "");
  return ROLES.includes(value as UserRole) ? (value as UserRole) : null;
}

/** Cadres cochés dans le formulaire (utile au seul rôle « saisie »). */
function readCadreIds(formData: FormData): string[] {
  return formData
    .getAll("cadre_ids")
    .map((value) => String(value))
    .filter(Boolean);
}

/** Remplace l'affectation aux cadres par la liste fournie. */
async function syncCadres(userId: string, cadreIds: string[]): Promise<void> {
  const supabase = await createClient();
  await supabase.from("user_cadres").delete().eq("user_id", userId);
  if (cadreIds.length > 0) {
    await supabase
      .from("user_cadres")
      .insert(
        cadreIds.map((cadreId) => ({ user_id: userId, cadre_id: cadreId })),
      );
  }
}

export async function createUser(
  _prevState: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.state;

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const role = readRole(formData);

  if (!email || !password || !fullName) {
    return { error: "يرجى ملء جميع الحقول الإجبارية" };
  }
  if (!role) return { error: "الدور غير صالح" };
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      error: `كلمة المرور يجب أن تتكون من ${MIN_PASSWORD_LENGTH} خانات على الأقل`,
    };
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    // Pas de serveur d'envoi d'e-mails configuré : le compte est confirmé
    // d'emblée, sinon l'utilisateur ne pourrait jamais se connecter.
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (error) {
    return {
      error: error.message.includes("already")
        ? "هذا البريد الإلكتروني مستعمل مسبقاً"
        : `تعذّر إنشاء المستخدم : ${error.message}`,
    };
  }

  // Le trigger `handle_new_user` a créé le profil avec le rôle `saisie` par
  // défaut ; on applique ensuite le rôle demandé.
  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({ full_name: fullName, role })
    .eq("id", data.user.id);

  await syncCadres(
    data.user.id,
    role === "saisie" ? readCadreIds(formData) : [],
  );

  await logAudit("create", "user", data.user.id);
  revalidatePath("/utilisateurs");
  return { success: `تم إنشاء المستخدم ${fullName}` };
}

export async function updateUser(
  userId: string,
  _prevState: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.state;

  const fullName = String(formData.get("full_name") ?? "").trim();
  const role = readRole(formData);
  const isActive = formData.get("is_active") === "on";

  if (!fullName) return { error: "الاسم الكامل مطلوب" };
  if (!role) return { error: "الدور غير صالح" };

  // Garde-fou : se retirer soi-même le rôle ou se désactiver ferme la porte
  // sans possibilité de la rouvrir depuis l'application.
  if (userId === guard.userId && (role !== "super_admin" || !isActive)) {
    return {
      error: "لا يمكنك تغيير دورك أو تعطيل حسابك بنفسك",
    };
  }

  // Même verrou au niveau du système : le dernier super_admin actif doit le
  // rester, sinon plus personne ne peut gérer les utilisateurs.
  const supabase = await createClient();
  const { data: before } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", userId)
    .maybeSingle();

  if (
    before?.role === "super_admin" &&
    before.is_active &&
    (role !== "super_admin" || !isActive) &&
    (await countActiveSuperAdmins()) <= 1
  ) {
    return { error: "يجب أن يبقى مدير عام واحد مفعّل على الأقل" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName, role, is_active: isActive })
    .eq("id", userId);

  if (error) {
    return error.code === "42501"
      ? { error: "لا تملك صلاحية تعديل هذا المستخدم" }
      : { error: "تعذّر حفظ التعديلات. حاول مرة أخرى" };
  }

  // Un utilisateur qui n'est plus « saisie » n'a plus de périmètre : ses
  // affectations sont retirées pour ne pas ressurgir s'il le redevient.
  await syncCadres(userId, role === "saisie" ? readCadreIds(formData) : []);

  await logAudit("update", "user", userId);
  revalidatePath("/utilisateurs");
  return { success: "تم حفظ التعديلات" };
}
