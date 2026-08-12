"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { homeRouteForRole } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

export type SignInState = { error: string } | null;

/**
 * Traduit les erreurs Supabase en arabe.
 *
 * Le message reste volontairement identique pour « e-mail inconnu » et « mot de
 * passe erroné » : les distinguer permettrait d'énumérer les comptes existants.
 */
function arabicAuthError(code: string | undefined): string {
  switch (code) {
    case "invalid_credentials":
      return "البريد الإلكتروني أو كلمة المرور غير صحيحة";
    case "email_not_confirmed":
      return "لم يتم تأكيد البريد الإلكتروني بعد";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "عدد المحاولات كبير. انتظر قليلاً ثم أعد المحاولة";
    case "user_banned":
      return "هذا الحساب موقوف. اتصل بالمدير العام";
    default:
      return "تعذّر تسجيل الدخول. حاول مرة أخرى";
  }
}

export async function signIn(
  _prevState: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "يرجى إدخال البريد الإلكتروني وكلمة المرور" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: arabicAuthError(error.code) };
  }

  // Le compte existe côté Auth, mais l'accès applicatif dépend du profil.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!profile) {
    await supabase.auth.signOut();
    return { error: "لا يوجد ملف تعريف مرتبط بهذا الحساب. اتصل بالمدير العام" };
  }

  if (!profile.is_active) {
    await supabase.auth.signOut();
    return { error: "هذا الحساب غير مفعّل. اتصل بالمدير العام" };
  }

  revalidatePath("/", "layout");
  // `redirect` lève une exception de contrôle : rien ne doit l'englober dans
  // un try/catch, sous peine d'annuler la redirection.
  redirect(homeRouteForRole(profile.role));
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
