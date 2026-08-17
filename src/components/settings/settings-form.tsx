"use client";

import Image from "next/image";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { ColorPicker } from "@/components/settings/color-picker";
import { Input } from "@/components/ui/input";
import { updateSettings, type SettingsFormState } from "@/lib/actions/settings";
import {
  DEFAULT_INACTIVITY_TIMEOUT_MINUTES,
  MAX_INACTIVITY_TIMEOUT_MINUTES,
  MIN_INACTIVITY_TIMEOUT_MINUTES,
} from "@/lib/constants";
import type { Settings } from "@/types";

export function SettingsForm({ settings }: { settings: Settings }) {
  const [state, formAction, pending] = useActionState<
    SettingsFormState,
    FormData
  >(updateSettings, null);

  const [partyName, setPartyName] = useState(settings.party_name ?? "");
  const [community, setCommunity] = useState(
    settings.territorial_community ?? "",
  );
  const [timeoutMinutes, setTimeoutMinutes] = useState(
    String(
      settings.inactivity_timeout_minutes ?? DEFAULT_INACTIVITY_TIMEOUT_MINUTES,
    ),
  );
  // Aperçu local du fichier choisi, avant tout envoi au serveur.
  const [preview, setPreview] = useState<string | null>(null);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <Field id="party_name" label="اسم الحزب" required>
        <Input
          id="party_name"
          name="party_name"
          value={partyName}
          onChange={(event) => setPartyName(event.target.value)}
          aria-required="true"
        />
      </Field>

      <Field id="territorial_community" label="الجماعة الترابية" required>
        <Input
          id="territorial_community"
          name="territorial_community"
          value={community}
          onChange={(event) => setCommunity(event.target.value)}
          aria-required="true"
        />
      </Field>

      <ColorPicker defaultValue={settings.primary_color} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="logo" className="font-medium">
          شعار الحزب
          <span className="ms-1 text-sm font-normal text-slate-500">
            (اختياري)
          </span>
        </label>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          {(preview || settings.logo_url) && (
            <div className="flex size-24 shrink-0 items-center justify-center rounded-lg border border-line bg-surface-muted p-2">
              {/* `unoptimized` : l'image vient de Supabase Storage, un domaine
                  externe. L'optimiseur Next exigerait de le déclarer dans la
                  configuration, pour un seul logo affiché une fois. */}
              <Image
                src={preview ?? settings.logo_url!}
                alt="شعار الحزب"
                width={80}
                height={80}
                unoptimized
                className="max-h-20 w-auto object-contain"
              />
            </div>
          )}

          <div className="flex-1">
            <input
              id="logo"
              name="logo"
              type="file"
              accept="image/png,image/jpeg"
              onChange={(event) => {
                const file = event.target.files?.[0];
                setPreview(file ? URL.createObjectURL(file) : null);
              }}
              className="block w-full text-sm file:me-3 file:min-h-touch file:cursor-pointer file:rounded-lg file:border file:border-line file:bg-surface file:px-4 file:font-medium"
            />
            <p className="mt-1.5 text-sm text-slate-500">
              PNG أو JPEG، بحجم أقصاه 2 ميغابايت. يظهر في ترويسة ملفات PDF
              وExcel.
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-line pt-5">
        <Field
          id="inactivity_timeout_minutes"
          label="مدة الخمول قبل تسجيل الخروج التلقائي (بالدقائق)"
          required
          hint={
            <p className="text-sm text-slate-500">
              بين {MIN_INACTIVITY_TIMEOUT_MINUTES} و{" "}
              {MAX_INACTIVITY_TIMEOUT_MINUTES} دقيقة. يُطبَّق على جميع
              المستخدمين، ويظهر تنبيه قبل الخروج بدقيقة.
            </p>
          }
        >
          {/* `type="text"` et non `number` : un champ numérique déclencherait
              une bulle de validation native, rédigée dans la langue du
              navigateur, au milieu d'une interface arabe. Le contrôle des
              bornes appartient au serveur et à la contrainte en base. */}
          <Input
            id="inactivity_timeout_minutes"
            name="inactivity_timeout_minutes"
            inputMode="numeric"
            value={timeoutMinutes}
            onChange={(event) => setTimeoutMinutes(event.target.value)}
            aria-required="true"
            className="max-w-32 ltr-field"
          />
        </Field>
      </div>

      {state?.error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {state.error}
        </p>
      )}
      {state?.success && (
        <p
          role="status"
          className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800"
        >
          تم حفظ الإعدادات
        </p>
      )}

      <div>
        <Button
          type="submit"
          size="lg"
          disabled={pending}
          className="w-full sm:w-auto"
        >
          {pending ? "جارٍ الحفظ…" : "حفظ الإعدادات"}
        </Button>
      </div>
    </form>
  );
}
