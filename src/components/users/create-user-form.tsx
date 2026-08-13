"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { CadreCheckboxes } from "@/components/users/cadre-checkboxes";
import { createUser, type UserFormState } from "@/lib/actions/users";
import { ROLE_LABELS } from "@/lib/constants";
import type { CadreWithCount, UserRole } from "@/types";

const ROLES: UserRole[] = ["saisie", "parlementaire", "super_admin"];

export function CreateUserForm({ cadres }: { cadres: CadreWithCount[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<UserFormState, FormData>(
    createUser,
    null,
  );
  // Champs contrôlés : React réinitialise les champs non contrôlés après
  // l'exécution d'une action. Sans cela, un mot de passe trop court effacerait
  // aussi le nom et l'adresse déjà saisis.
  const [values, setValues] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "saisie" as UserRole,
  });
  const set = (name: keyof typeof values) => (value: string) =>
    setValues((current) => ({ ...current, [name]: value }));
  const role = values.role;

  // Une création réussie referme le formulaire et le vide.
  //
  // Les champs étant désormais contrôlés, ils resteraient sinon remplis avec
  // les données du compte créé — et le message de succès, rendu hors du
  // formulaire, ne serait pas visible : l'utilisateur croirait à un échec.
  const [lastSuccess, setLastSuccess] = useState<string | undefined>();
  if (state?.success && state.success !== lastSuccess) {
    setLastSuccess(state.success);
    setOpen(false);
    setValues({
      full_name: "",
      email: "",
      password: "",
      role: "saisie" as UserRole,
    });
  }

  if (!open) {
    return (
      <div className="mb-6 flex flex-col gap-2">
        <Button onClick={() => setOpen(true)} className="w-full sm:w-auto">
          إضافة مستخدم
        </Button>
        {state?.success && (
          <p
            role="status"
            className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800"
          >
            {state.success}
          </p>
        )}
      </div>
    );
  }

  return (
    <section className="mb-6 rounded-xl border border-line bg-surface p-4 sm:p-6">
      <h2 className="mb-4 font-semibold">إضافة مستخدم جديد</h2>

      <form action={formAction} className="flex flex-col gap-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="new_full_name" label="الاسم الكامل" required>
            <Input
              id="new_full_name"
              name="full_name"
              value={values.full_name}
              onChange={(event) => set("full_name")(event.target.value)}
              aria-required="true"
            />
          </Field>

          <Field id="new_email" label="البريد الإلكتروني" required>
            <Input
              id="new_email"
              name="email"
              type="email"
              dir="ltr"
              autoComplete="off"
              value={values.email}
              onChange={(event) => set("email")(event.target.value)}
              aria-required="true"
            />
          </Field>

          <Field id="new_password" label="كلمة المرور الأولية" required>
            <Input
              id="new_password"
              name="password"
              type="password"
              dir="ltr"
              autoComplete="new-password"
              value={values.password}
              onChange={(event) => set("password")(event.target.value)}
              aria-required="true"
            />
          </Field>

          <Field id="new_role" label="الدور" required>
            <select
              id="new_role"
              name="role"
              value={role}
              onChange={(event) => set("role")(event.target.value)}
              className="min-h-touch w-full rounded-lg border border-line bg-surface px-3 text-base"
            >
              {ROLES.map((value) => (
                <option key={value} value={value}>
                  {ROLE_LABELS[value]}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <p className="text-sm text-slate-500">
          كلمة المرور من 10 خانات على الأقل. سلّمها للمستخدم عبر قناة آمنة — لا
          يرسل النظام أي بريد إلكتروني.
        </p>

        <CadreCheckboxes
          cadres={cadres}
          selected={[]}
          visible={role === "saisie"}
        />

        {state?.error && (
          <p
            role="alert"
            className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {state.error}
          </p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            type="submit"
            size="lg"
            disabled={pending}
            className="w-full sm:w-auto"
          >
            {pending ? "جارٍ الإنشاء…" : "إنشاء المستخدم"}
          </Button>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => setOpen(false)}
            className="w-full sm:w-auto"
          >
            إلغاء
          </Button>
        </div>
      </form>
    </section>
  );
}
