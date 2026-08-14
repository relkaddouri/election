"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { CadreCheckboxes } from "@/components/users/cadre-checkboxes";
import { type UserFormState } from "@/lib/actions/users";
import { ROLE_LABELS } from "@/lib/constants";
import type { ManagedUser } from "@/lib/data/users";
import type { CadreWithCount, UserRole } from "@/types";

const ROLES: UserRole[] = ["saisie", "parlementaire", "super_admin"];

/**
 * Formulaire unique, utilisé pour créer comme pour modifier.
 *
 * Un seul écran, un seul enregistrement : le mot de passe se change ici, sans
 * page dédiée de réinitialisation. En modification, un champ laissé vide
 * signifie « ne pas y toucher » — c'est le comportement le plus sûr, puisque
 * l'oubli ne fait rien plutôt que d'écraser un mot de passe en service.
 */
export function UserForm({
  action,
  user,
  cadres,
  isSelf = false,
  onDone,
}: {
  action: (state: UserFormState, formData: FormData) => Promise<UserFormState>;
  /** Absent en création. */
  user?: ManagedUser;
  cadres: CadreWithCount[];
  /** Empêche l'utilisateur de se retirer ses propres droits. */
  isSelf?: boolean;
  onDone?: () => void;
}) {
  const [state, formAction, pending] = useActionState<UserFormState, FormData>(
    action,
    null,
  );

  // Champs contrôlés : React réinitialise les champs non contrôlés après
  // l'exécution d'une action. Sans cela, une erreur de validation effacerait
  // tout ce qui a déjà été saisi.
  const [values, setValues] = useState({
    full_name: user?.full_name ?? "",
    username: user?.username ?? "",
    password: "",
    role: (user?.role ?? "saisie") as UserRole,
    is_active: user?.is_active ?? true,
  });
  const set = <K extends keyof typeof values>(
    name: K,
    value: (typeof values)[K],
  ) => setValues((current) => ({ ...current, [name]: value }));

  // Referme et vide le formulaire après une création réussie.
  const [lastSuccess, setLastSuccess] = useState<string | undefined>();
  if (state?.success && state.success !== lastSuccess) {
    setLastSuccess(state.success);
    if (!user) {
      setValues({
        full_name: "",
        username: "",
        password: "",
        role: "saisie",
        is_active: true,
      });
    } else {
      // En édition, le mot de passe ne doit pas rester en clair à l'écran une
      // fois enregistré.
      set("password", "");
    }
    onDone?.();
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          id={`full_name-${user?.id ?? "new"}`}
          label="الاسم الكامل"
          required
        >
          <Input
            id={`full_name-${user?.id ?? "new"}`}
            name="full_name"
            value={values.full_name}
            onChange={(event) => set("full_name", event.target.value)}
            aria-required="true"
          />
        </Field>

        <Field
          id={`username-${user?.id ?? "new"}`}
          label="اسم المستخدم"
          required
          hint={
            <p className="text-sm text-slate-500">
              يُستعمل لتسجيل الدخول. حروف لاتينية صغيرة وأرقام فقط.
            </p>
          }
        >
          {/* dir="ltr" : identifiant latin, saisi et lu de gauche à droite. */}
          <Input
            id={`username-${user?.id ?? "new"}`}
            name="username"
            dir="ltr"
            autoComplete="off"
            value={values.username}
            onChange={(event) => set("username", event.target.value)}
            aria-required="true"
          />
        </Field>

        <Field
          id={`password-${user?.id ?? "new"}`}
          label="كلمة المرور"
          required={!user}
          hint={
            user ? (
              <p className="text-sm text-slate-500">
                اتركها فارغة للإبقاء على كلمة المرور الحالية.
              </p>
            ) : (
              <p className="text-sm text-slate-500">
                سلّمها للمستخدم عبر قناة آمنة — لا يرسل النظام أي رسالة.
              </p>
            )
          }
        >
          <PasswordInput
            id={`password-${user?.id ?? "new"}`}
            name="password"
            autoComplete="new-password"
            value={values.password}
            onChange={(event) => set("password", event.target.value)}
            aria-required={user ? undefined : "true"}
          />
        </Field>

        <Field id={`role-${user?.id ?? "new"}`} label="الدور" required>
          <select
            id={`role-${user?.id ?? "new"}`}
            name="role"
            value={values.role}
            onChange={(event) => set("role", event.target.value as UserRole)}
            disabled={isSelf}
            className="min-h-touch w-full rounded-lg border border-line bg-surface px-3 text-base disabled:opacity-60"
          >
            {ROLES.map((value) => (
              <option key={value} value={value}>
                {ROLE_LABELS[value]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {user && (
        <label className="flex min-h-touch items-center gap-2">
          <input
            type="checkbox"
            name="is_active"
            checked={values.is_active}
            onChange={(event) => set("is_active", event.target.checked)}
            disabled={isSelf}
            className="size-4"
          />
          <span>الحساب مفعّل</span>
        </label>
      )}

      {isSelf && (
        <>
          {/* Un contrôle `disabled` n'est pas transmis par le navigateur :
              sans ces champs cachés, le formulaire partirait sans rôle et
              l'utilisateur ne pourrait même pas se renommer. Le serveur
              revérifie de toute façon qu'on ne modifie pas ses propres
              droits. */}
          <input type="hidden" name="role" value={values.role} />
          {values.is_active && (
            <input type="hidden" name="is_active" value="on" />
          )}
          <p className="rounded-lg bg-surface-muted px-3 py-2 text-sm text-slate-600">
            لا يمكنك تغيير دورك أو تعطيل حسابك بنفسك. اطلب ذلك من مدير عام آخر.
          </p>
        </>
      )}

      <CadreCheckboxes
        cadres={cadres}
        selected={user?.cadres.map((cadre) => cadre.id) ?? []}
        visible={values.role === "saisie"}
      />

      {state?.error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {state.error}
        </p>
      )}
      {state?.success && user && (
        <p
          role="status"
          className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800"
        >
          {state.success}
        </p>
      )}

      <div>
        <Button
          type="submit"
          size="lg"
          disabled={pending}
          className="w-full sm:w-auto"
        >
          {pending ? "جارٍ الحفظ…" : "حفظ"}
        </Button>
      </div>
    </form>
  );
}
