"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { checkCadreCin, type CadreFormState } from "@/lib/actions/cadres";
import { CIN_CHECK_DEBOUNCE_MS } from "@/lib/constants";
import { normalizeCin } from "@/lib/utils";
import type { Cadre } from "@/types";

type CinStatus = "idle" | "checking" | "available" | "taken";

export function CadreForm({
  action,
  cadre,
  submitLabel,
}: {
  action: (
    state: CadreFormState,
    formData: FormData,
  ) => Promise<CadreFormState>;
  cadre?: Cadre;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<CadreFormState, FormData>(
    action,
    null,
  );

  // Champs contrôlés : React réinitialise les champs non contrôlés après
  // l'exécution d'une action, ce qui effacerait une saisie longue en cas
  // d'erreur serveur.
  const initial = state?.values ?? {
    cin: cadre?.cin ?? "",
    full_name: cadre?.full_name ?? "",
    phone: cadre?.phone ?? "",
    polling_station_number: cadre?.polling_station_number ?? "",
    polling_location: cadre?.polling_location ?? "",
  };
  const [values, setValues] = useState(initial);
  const set = (name: keyof typeof initial) => (value: string) =>
    setValues((current) => ({ ...current, [name]: value }));

  // Seul le résultat de la vérification est stocké, associé au CIN qui l'a
  // produit. Le statut affiché en découle pendant le rendu : le mémoriser
  // séparément le laisserait dériver de la valeur réelle du champ.
  const [checked, setChecked] = useState<{
    cin: string;
    taken: boolean;
  } | null>(null);
  // Numéro de séquence : une réponse lente arrivant après une frappe plus
  // récente ne doit pas écraser un résultat plus à jour.
  const checkSeq = useRef(0);

  const normalizedCin = normalizeCin(values.cin);
  // Rouvrir le formulaire sans toucher au CIN ne doit rien déclencher.
  const cinUnchanged = normalizedCin === normalizeCin(cadre?.cin ?? "");
  const cadreId = cadre?.id;

  useEffect(() => {
    if (!normalizedCin || cinUnchanged) return;

    const seq = ++checkSeq.current;
    const timer = setTimeout(async () => {
      const { taken } = await checkCadreCin(normalizedCin, cadreId);
      if (seq === checkSeq.current) setChecked({ cin: normalizedCin, taken });
    }, CIN_CHECK_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [normalizedCin, cinUnchanged, cadreId]);

  const cinStatus: CinStatus =
    !normalizedCin || cinUnchanged
      ? "idle"
      : checked?.cin === normalizedCin
        ? checked.taken
          ? "taken"
          : "available"
        : "checking";

  const cinError = state?.fieldErrors?.cin;
  const cinTaken = cinStatus === "taken";

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {/* Une colonne sur mobile, deux dès `sm` — exigence responsive du brief. */}
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field
            id="cin"
            label="رقم البطاقة الوطنية"
            required
            error={
              cinError ?? (cinTaken ? "هذا المؤطر مسجل مسبقاً" : undefined)
            }
            hint={
              cinStatus === "checking" ? (
                <p className="text-sm text-slate-500">جارٍ التحقق…</p>
              ) : cinStatus === "available" ? (
                <p className="text-sm text-brand-700">الرقم متاح</p>
              ) : null
            }
          >
            {/* dir="ltr" : le CIN est alphanumérique latin. La normalisation
                (chiffres arabes, espaces, casse) est refaite côté base. */}
            <Input
              id="cin"
              name="cin"
              dir="ltr"
              value={values.cin}
              onChange={(event) => set("cin")(event.target.value)}
              aria-required="true"
              aria-invalid={cinError || cinTaken ? true : undefined}
              aria-describedby={cinError ? "cin-error" : undefined}
            />
          </Field>
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

        <Field id="phone" label="رقم الهاتف">
          <Input
            id="phone"
            name="phone"
            type="tel"
            dir="ltr"
            value={values.phone}
            onChange={(event) => set("phone")(event.target.value)}
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

        <div className="sm:col-span-2">
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
        </div>
      </div>

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
          disabled={pending || cinTaken}
          className="w-full sm:w-auto"
        >
          {pending ? "جارٍ الحفظ…" : submitLabel}
        </Button>
        <Link
          href={cadre ? `/cadres/${cadre.id}` : "/cadres"}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-lg border border-line px-6 font-medium hover:bg-surface-muted sm:w-auto"
        >
          إلغاء
        </Link>
      </div>
    </form>
  );
}
