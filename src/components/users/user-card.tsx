"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { CadreCheckboxes } from "@/components/users/cadre-checkboxes";
import { updateUser, type UserFormState } from "@/lib/actions/users";
import { ROLE_BADGES, ROLE_LABELS } from "@/lib/constants";
import type { CadreWithCount, UserRole } from "@/types";
import type { ManagedUser } from "@/lib/data/users";

const ROLES: UserRole[] = ["saisie", "parlementaire", "super_admin"];

export function UserCard({
  user,
  cadres,
  isSelf,
}: {
  user: ManagedUser;
  cadres: CadreWithCount[];
  /** Empêche l'utilisateur de se retirer ses propres droits. */
  isSelf: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState<UserFormState, FormData>(
    updateUser.bind(null, user.id),
    null,
  );
  const [role, setRole] = useState<UserRole>(user.role);
  // Contrôlé pour la même raison : un échec de validation ramènerait sinon le
  // champ à sa valeur d'origine, effaçant la correction en cours.
  const [fullName, setFullName] = useState(user.full_name);

  const assignedIds = user.cadres.map((cadre) => cadre.id);

  return (
    <li className="rounded-xl border border-line bg-surface p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{user.full_name}</span>
            {!user.is_active && (
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-sm text-red-700">
                معطّل
              </span>
            )}
            {isSelf && (
              <span className="rounded-full bg-surface-muted px-2 py-0.5 text-sm text-slate-600">
                أنت
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate ltr-field text-sm text-slate-500">
            {user.email ?? "—"}
          </p>
          <p className="mt-1 text-sm">
            <span aria-hidden="true">{ROLE_BADGES[user.role]}</span>{" "}
            {ROLE_LABELS[user.role]}
          </p>
          {user.role === "saisie" && (
            <p className="mt-1 text-sm text-slate-600">
              {user.cadres.length === 0
                ? "لا يوجد مؤطر مسند — لن يرى أي ناخب"
                : `المؤطرون : ${user.cadres.map((c) => c.full_name).join("، ")}`}
            </p>
          )}
        </div>

        <Button
          variant="secondary"
          onClick={() => setEditing((value) => !value)}
          className="w-full shrink-0 sm:w-auto"
        >
          {editing ? "إغلاق" : "تعديل"}
        </Button>
      </div>

      {state?.success && !editing && (
        <p
          role="status"
          className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800"
        >
          {state.success}
        </p>
      )}

      {editing && (
        <form
          action={formAction}
          className="mt-4 flex flex-col gap-4 border-t border-line pt-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id={`name-${user.id}`} label="الاسم الكامل" required>
              <Input
                id={`name-${user.id}`}
                name="full_name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                aria-required="true"
              />
            </Field>

            <Field id={`role-${user.id}`} label="الدور" required>
              <select
                id={`role-${user.id}`}
                name="role"
                value={role}
                onChange={(event) => setRole(event.target.value as UserRole)}
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

          <label className="flex min-h-touch items-center gap-2">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked={user.is_active}
              disabled={isSelf}
              className="size-4"
            />
            <span>الحساب مفعّل</span>
          </label>

          {isSelf && (
            <>
              {/* Un contrôle `disabled` n'est pas transmis par le navigateur :
                  sans ces champs cachés, le formulaire partirait sans rôle et
                  l'utilisateur ne pourrait même pas se renommer. Le serveur
                  revérifie de toute façon qu'on ne modifie pas ses propres
                  droits. */}
              <input type="hidden" name="role" value={user.role} />
              {user.is_active && (
                <input type="hidden" name="is_active" value="on" />
              )}
              <p className="rounded-lg bg-surface-muted px-3 py-2 text-sm text-slate-600">
                لا يمكنك تغيير دورك أو تعطيل حسابك بنفسك. اطلب ذلك من مدير عام
                آخر.
              </p>
            </>
          )}

          <CadreCheckboxes
            cadres={cadres}
            selected={assignedIds}
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

          <div>
            <Button
              type="submit"
              disabled={pending}
              className="w-full sm:w-auto"
            >
              {pending ? "جارٍ الحفظ…" : "حفظ"}
            </Button>
          </div>
        </form>
      )}
    </li>
  );
}
