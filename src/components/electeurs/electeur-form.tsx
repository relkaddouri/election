"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  checkElecteurCin,
  type ElecteurFormState,
} from "@/lib/actions/electeurs";
import {
  CIN_CHECK_DEBOUNCE_MS,
  ELECTEUR_DUPLICATE_MESSAGE,
} from "@/lib/constants";
import { normalizeCin } from "@/lib/utils";
import type { Cadre, DuplicateCadre, Electeur } from "@/types";

type CinCheck = { cin: string; duplicate: DuplicateCadre | null };

export function ElecteurForm({
  action,
  cadres,
  electeur,
  defaultCadreId,
  submitLabel,
}: {
  action: (
    state: ElecteurFormState,
    formData: FormData,
  ) => Promise<ElecteurFormState>;
  /** Cadres que l'utilisateur a le droit d'alimenter (déjà filtrés par le RLS). */
  cadres: Pick<Cadre, "id" | "full_name">[];
  electeur?: Electeur;
  defaultCadreId?: string;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<
    ElecteurFormState,
    FormData
  >(action, null);

  const initial = state?.values ?? {
    cin: electeur?.cin ?? "",
    full_name: electeur?.full_name ?? "",
    phone: electeur?.phone ?? "",
    polling_station_number: electeur?.polling_station_number ?? "",
    polling_location: electeur?.polling_location ?? "",
    cadre_id: electeur?.cadre_id ?? defaultCadreId ?? cadres[0]?.id ?? "",
  };
  const [values, setValues] = useState(initial);
  const set = (name: keyof typeof initial) => (value: string) =>
    setValues((current) => ({ ...current, [name]: value }));

  // Seul le résultat est mémorisé, associé au CIN qui l'a produit ; l'état
  // affiché en découle pendant le rendu.
  const [checked, setChecked] = useState<CinCheck | null>(null);
  // Une réponse lente ne doit pas écraser un résultat plus récent.
  const checkSeq = useRef(0);

  const normalizedCin = normalizeCin(values.cin);
  const cinUnchanged = normalizedCin === normalizeCin(electeur?.cin ?? "");
  const electeurId = electeur?.id;

  useEffect(() => {
    if (!normalizedCin || cinUnchanged) return;

    const seq = ++checkSeq.current;
    const timer = setTimeout(async () => {
      const { duplicate } = await checkElecteurCin(normalizedCin, electeurId);
      if (seq === checkSeq.current)
        setChecked({ cin: normalizedCin, duplicate });
    }, CIN_CHECK_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [normalizedCin, cinUnchanged, electeurId]);

  const settled = checked?.cin === normalizedCin;
  const checking = Boolean(normalizedCin) && !cinUnchanged && !settled;
  // Le doublon détecté en direct, ou celui remonté par la contrainte UNIQUE.
  const duplicate = state?.duplicate ?? (settled ? checked.duplicate : null);
  const isDuplicate = Boolean(duplicate) || Boolean(state?.fieldErrors?.cin);
  const available = settled && !checked.duplicate && !state?.fieldErrors?.cin;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {/* Une colonne sur mobile, grille dès `sm`. */}
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field
            id="cin"
            label="رقم البطاقة الوطنية"
            required
            error={isDuplicate ? ELECTEUR_DUPLICATE_MESSAGE : undefined}
            hint={
              checking ? (
                <p className="text-sm text-slate-500">جارٍ التحقق…</p>
              ) : available ? (
                <p className="text-sm text-brand-700">الرقم متاح</p>
              ) : null
            }
          >
            <Input
              id="cin"
              name="cin"
              dir="ltr"
              value={values.cin}
              onChange={(event) => set("cin")(event.target.value)}
              aria-required="true"
              aria-invalid={isDuplicate ? true : undefined}
              aria-describedby={isDuplicate ? "cin-error" : undefined}
            />
          </Field>

          {/* Nommer le cadre détenteur permet à l'utilisateur de savoir vers
              qui se tourner, plutôt que de constater un refus opaque. */}
          {duplicate && (
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
              مسجَّل لدى المؤطر :{" "}
              <Link
                href={`/cadres/${duplicate.cadreId}`}
                className="font-semibold underline"
              >
                {duplicate.cadreFullName}
              </Link>
            </p>
          )}
        </div>

        <div className="sm:col-span-2">
          <Field
            id="full_name"
            label="الاسم الكامل"
            required
            error={state?.fieldErrors?.full_name}
          >
            <Input
              id="full_name"
              name="full_name"
              value={values.full_name}
              onChange={(event) => set("full_name")(event.target.value)}
              aria-required="true"
            />
          </Field>
        </div>

        <Field
          id="phone"
          label="رقم الهاتف"
          required
          error={state?.fieldErrors?.phone}
        >
          <Input
            id="phone"
            name="phone"
            type="tel"
            dir="ltr"
            value={values.phone}
            onChange={(event) => set("phone")(event.target.value)}
            aria-required="true"
          />
        </Field>

        <Field
          id="polling_station_number"
          label="رقم مكتب التصويت"
          required
          error={state?.fieldErrors?.polling_station_number}
        >
          <Input
            id="polling_station_number"
            name="polling_station_number"
            dir="ltr"
            value={values.polling_station_number}
            onChange={(event) =>
              set("polling_station_number")(event.target.value)
            }
            aria-required="true"
          />
        </Field>

        <Field
          id="polling_location"
          label="مكان التصويت"
          required
          error={state?.fieldErrors?.polling_location}
        >
          <Input
            id="polling_location"
            name="polling_location"
            value={values.polling_location}
            onChange={(event) => set("polling_location")(event.target.value)}
            aria-required="true"
          />
        </Field>

        <Field
          id="cadre_id"
          label="المؤطر"
          required
          error={state?.fieldErrors?.cadre_id}
        >
          <select
            id="cadre_id"
            name="cadre_id"
            value={values.cadre_id}
            onChange={(event) => set("cadre_id")(event.target.value)}
            aria-required="true"
            className="min-h-touch w-full rounded-lg border border-line bg-surface px-3 text-base"
          >
            {cadres.length === 0 && <option value="">لا يوجد مؤطر متاح</option>}
            {cadres.map((cadre) => (
              <option key={cadre.id} value={cadre.id}>
                {cadre.full_name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {/* رقم الترتيب est calculé automatiquement : aucun champ ne l'expose. */}
      <p className="text-sm text-slate-500">
        رقم الترتيب يُحتسب تلقائياً داخل كل مؤطر ولا يُدخل يدوياً.
      </p>

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
          disabled={pending || isDuplicate || cadres.length === 0}
          className="w-full sm:w-auto"
        >
          {pending ? "جارٍ الحفظ…" : submitLabel}
        </Button>
        <Link
          href="/electeurs"
          className="inline-flex min-h-12 w-full items-center justify-center rounded-lg border border-line px-6 font-medium hover:bg-surface-muted sm:w-auto"
        >
          إلغاء
        </Link>
      </div>
    </form>
  );
}
