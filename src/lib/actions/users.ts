"use server";

import { revalidatePath } from "next/cache";

import { logAudit } from "@/lib/audit";
import { getSessionUser } from "@/lib/auth";
import { MIN_PASSWORD_LENGTH } from "@/lib/constants";
import { countActiveSuperAdmins } from "@/lib/data/users";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import {
  isValidUsername,
  MIN_USERNAME_LENGTH,
  normalizeUsername,
  usernameToEmail,
} from "@/lib/username";
import type { UserRole } from "@/types";

export type UserFormState = {
  error?: string;
  success?: string;
} | null;

const ROLES: UserRole[] = ["super_admin", "saisie", "parlementaire"];

/**
 * Le client d'administration contourne le RLS : rien ne l'empêcherait de créer
 * un super_admin ni de réécrire le mot de passe d'autrui. Toute action qui
 * l'utilise doit donc vérifier elle-même l'appelant, ici et non ailleurs.
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

type FormValues = {
  fullName: string;
  username: string;
  password: string;
  role: UserRole | null;
  isActive: boolean;
};

function readForm(formData: FormData): FormValues {
  const role = String(formData.get("role") ?? "");
  return {
    fullName: String(formData.get("full_name") ?? "").trim(),
    username: normalizeUsername(String(formData.get("username") ?? "")),
    // Jamais rogné : un espace peut faire partie du mot de passe.
    password: String(formData.get("password") ?? ""),
    role: ROLES.includes(role as UserRole) ? (role as UserRole) : null,
    isActive: formData.get("is_active") === "on",
  };
}

/** Valeurs validées : le rôle y est garanti non nul. */
type ValidValues = Omit<FormValues, "role"> & { role: UserRole };

/**
 * Contrôles communs à la création et à la modification.
 *
 * Renvoie les valeurs avec un rôle non nul plutôt qu'un simple message :
 * l'appelant obtient ainsi la garantie par le type, sans avoir à retester.
 */
function validate(
  values: FormValues,
  { passwordRequired }: { passwordRequired: boolean },
): { error: string } | { values: ValidValues } {
  if (!values.fullName) return { error: "الاسم الكامل مطلوب" };
  if (!values.username) return { error: "اسم المستخدم مطلوب" };
  if (!isValidUsername(values.username)) {
    return {
      error: `اسم المستخدم يجب أن يتكون من ${MIN_USERNAME_LENGTH} خانات على الأقل، بحروف لاتينية صغيرة وأرقام فقط`,
    };
  }
  if (!values.role) return { error: "الدور غير صالح" };

  // En modification, un champ vide signifie « ne pas toucher au mot de passe ».
  const passwordNeeded = passwordRequired || values.password.length > 0;
  if (passwordNeeded && values.password.length < MIN_PASSWORD_LENGTH) {
    return {
      error: `كلمة المرور يجب أن تتكون من ${MIN_PASSWORD_LENGTH} خانات على الأقل`,
    };
  }

  return { values: { ...values, role: values.role } };
}

function duplicateUsernameMessage(message: string): string | null {
  return /already|duplicate|exists/i.test(message)
    ? "اسم المستخدم مستعمل مسبقاً"
    : null;
}

export async function createUser(
  _prevState: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.state;

  const checked = validate(readForm(formData), { passwordRequired: true });
  if ("error" in checked) return { error: checked.error };
  const values = checked.values;

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    // Adresse fabriquée à partir du nom d'utilisateur : elle satisfait Supabase
    // Auth et n'est jamais montrée.
    email: usernameToEmail(values.username),
    password: values.password,
    // Aucun serveur d'envoi d'e-mails n'est configuré — et l'adresse n'existe
    // pas. Le compte est donc confirmé d'emblée, sinon la connexion serait
    // impossible.
    email_confirm: true,
    user_metadata: { full_name: values.fullName },
  });

  if (error) {
    return {
      error:
        duplicateUsernameMessage(error.message) ??
        `تعذّر إنشاء المستخدم : ${error.message}`,
    };
  }

  // Le trigger `handle_new_user` a créé le profil avec le rôle `saisie` par
  // défaut ; on applique ensuite le rôle demandé.
  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({ full_name: values.fullName, role: values.role })
    .eq("id", data.user.id);

  await logAudit("create", "user", data.user.id);
  revalidatePath("/utilisateurs");
  return { success: `تم إنشاء المستخدم ${values.fullName}` };
}

export async function updateUser(
  userId: string,
  _prevState: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.state;

  const checked = validate(readForm(formData), { passwordRequired: false });
  if ("error" in checked) return { error: checked.error };
  const values = checked.values;

  // Garde-fou : se retirer soi-même le rôle ou se désactiver ferme la porte
  // sans possibilité de la rouvrir depuis l'application.
  if (
    userId === guard.userId &&
    (values.role !== "super_admin" || !values.isActive)
  ) {
    return { error: "لا يمكنك تغيير دورك أو تعطيل حسابك بنفسك" };
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
    (values.role !== "super_admin" || !values.isActive) &&
    (await countActiveSuperAdmins()) <= 1
  ) {
    return { error: "يجب أن يبقى مدير عام واحد مفعّل على الأقل" };
  }

  // --- Identifiant de connexion et mot de passe ------------------------------
  //
  // Les deux vivent dans `auth.users`, hors d'atteinte du RLS : ils passent
  // obligatoirement par l'API d'administration, côté serveur. Un mot de passe
  // laissé vide n'est pas transmis — il reste inchangé.
  const admin = createAdminClient();
  const attributes: { email?: string; password?: string } = {
    email: usernameToEmail(values.username),
  };
  if (values.password) attributes.password = values.password;

  const { error: authError } = await admin.auth.admin.updateUserById(
    userId,
    attributes,
  );

  if (authError) {
    return {
      error:
        duplicateUsernameMessage(authError.message) ??
        `تعذّر حفظ بيانات الدخول : ${authError.message}`,
    };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: values.fullName,
      role: values.role,
      is_active: values.isActive,
    })
    .eq("id", userId);

  if (error) {
    return error.code === "42501"
      ? { error: "لا تملك صلاحية تعديل هذا المستخدم" }
      : { error: "تعذّر حفظ التعديلات. حاول مرة أخرى" };
  }

  // Un utilisateur qui n'est plus « saisie » n'a plus de périmètre : ses
  // affectations sont retirées pour ne pas ressurgir s'il le redevient.

  await logAudit("update", "user", userId);
  revalidatePath("/utilisateurs");
  return {
    success: values.password
      ? "تم حفظ التعديلات وتغيير كلمة المرور"
      : "تم حفظ التعديلات",
  };
}
