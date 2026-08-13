"use client";

import type { CadreWithCount } from "@/types";

/**
 * Affectation aux cadres.
 *
 * Visible uniquement pour le rôle « saisie » : c'est le seul dont le périmètre
 * RLS dépend de `user_cadres`. Un super_admin ou un parlementaire voient tout,
 * l'affectation n'aurait aucun effet et laisserait croire le contraire.
 */
export function CadreCheckboxes({
  cadres,
  selected,
  visible,
}: {
  cadres: CadreWithCount[];
  selected: string[];
  visible: boolean;
}) {
  if (!visible) return null;

  if (cadres.length === 0) {
    return (
      <p className="rounded-lg bg-surface-muted px-3 py-2 text-sm text-slate-600">
        لا يوجد أي مؤطر لإسناده. أنشئ مؤطراً أولاً.
      </p>
    );
  }

  return (
    <fieldset className="rounded-lg border border-line p-3">
      <legend className="px-1 text-sm font-medium">المؤطرون المسندون</legend>
      <p className="mb-2 text-sm text-slate-500">
        لن يرى هذا المستخدم سوى ناخبي المؤطرين المحددين.
      </p>
      <div className="grid gap-1 sm:grid-cols-2">
        {cadres.map((cadre) => (
          <label
            key={cadre.id}
            className="flex min-h-touch items-center gap-2 rounded-lg px-2 hover:bg-surface-muted"
          >
            <input
              type="checkbox"
              name="cadre_ids"
              value={cadre.id}
              defaultChecked={selected.includes(cadre.id)}
              className="size-4"
            />
            <span className="truncate">{cadre.full_name}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
