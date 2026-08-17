"use client";

import { useState } from "react";

import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  REPORT_FREQUENCY_LABELS,
  REPORT_SEND_HOUR_LABEL,
  WEEKDAY_LABELS,
} from "@/lib/constants";
import type { ReportFrequency, Settings } from "@/types";

const SELECT_CLASS =
  "min-h-touch w-full rounded-lg border border-line bg-surface px-3 text-base focus:border-brand-600 focus:outline-none";

const DAYS_OF_MONTH = Array.from({ length: 31 }, (_, index) => index + 1);

/**
 * Section « إرسال التقارير التلقائي » du formulaire des réglages.
 *
 * Composant client parce que deux champs n'existent que pour certaines
 * fréquences : afficher les trois en permanence laisserait croire qu'un envoi
 * quotidien tient compte du jour de la semaine choisi.
 *
 * Les champs masqués ne sont pas rendus du tout, et non simplement cachés en
 * CSS : un champ masqué mais présent serait tout de même envoyé, et la base
 * enregistrerait un jour de semaine pour une planification mensuelle.
 */
export function ReportScheduleFields({ settings }: { settings: Settings }) {
  const [email, setEmail] = useState(settings.report_email ?? "");
  const [frequency, setFrequency] = useState<ReportFrequency>(
    settings.report_frequency,
  );
  const [enabled, setEnabled] = useState(settings.report_enabled);

  return (
    <section className="flex flex-col gap-5 border-t border-line pt-5">
      <div>
        <h2 className="font-semibold">إرسال التقارير التلقائي</h2>
        <p className="mt-1 text-sm text-slate-600">
          يُرسَل ملف Excel الشامل — ورقة لكل مؤطر — إلى العنوان المحدد أسفله.
        </p>
      </div>

      <Field
        id="report_email"
        label="البريد الإلكتروني للمُستقبِل"
        required={enabled}
        hint={
          <p className="text-sm text-slate-500">
            يُستعمل أيضاً عند الإرسال اليدوي من صفحة التقارير.
          </p>
        }
      >
        {/* `dir="ltr"` : une adresse électronique est du texte latin ; alignée
            à droite, la ponctuation se retrouverait du mauvais côté.
            `type="text"` et non `email` : la validation native afficherait une
            bulle rédigée dans la langue du navigateur. */}
        <Input
          id="report_email"
          name="report_email"
          dir="ltr"
          inputMode="email"
          autoComplete="email"
          placeholder="rapports@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="report_frequency" className="font-medium">
            وتيرة الإرسال
          </label>
          <select
            id="report_frequency"
            name="report_frequency"
            value={frequency}
            onChange={(event) =>
              setFrequency(event.target.value as ReportFrequency)
            }
            className={SELECT_CLASS}
          >
            {Object.entries(REPORT_FREQUENCY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {frequency === "weekly" && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="report_weekday" className="font-medium">
              يوم الأسبوع
            </label>
            <select
              id="report_weekday"
              name="report_weekday"
              defaultValue={String(settings.report_weekday ?? 1)}
              className={SELECT_CLASS}
            >
              {WEEKDAY_LABELS.map((label, index) => (
                <option key={label} value={index}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        )}

        {frequency === "monthly" && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="report_day_of_month" className="font-medium">
              يوم الشهر
            </label>
            <select
              id="report_day_of_month"
              name="report_day_of_month"
              defaultValue={String(settings.report_day_of_month ?? 1)}
              className={SELECT_CLASS}
            >
              {DAYS_OF_MONTH.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
            <p className="text-sm text-slate-500">
              إذا لم يوجد هذا اليوم في الشهر، يُرسَل التقرير في آخر يوم منه.
            </p>
          </div>
        )}
      </div>

      {/* Interrupteur : une case à cocher réelle, masquée visuellement. Un
          `<div>` cliquable perdrait le clavier, l'envoi du formulaire et la
          restitution par les lecteurs d'écran. */}
      <label className="flex cursor-pointer items-center gap-3 self-start">
        <input
          type="checkbox"
          name="report_enabled"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className="flex h-6 w-11 shrink-0 items-center rounded-full bg-slate-300 p-0.5 transition-colors peer-checked:justify-end peer-checked:bg-brand-600 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-600"
        >
          {/* `justify-end` en RTL place le curseur à gauche : l'interrupteur
              se déplace de la droite (إيقاف) vers la gauche (تفعيل). */}
          <span className="size-5 rounded-full bg-surface shadow" />
        </span>
        <span className="font-medium">
          {enabled ? "الإرسال التلقائي مُفعَّل" : "الإرسال التلقائي متوقف"}
        </span>
      </label>

      <p className="rounded-lg bg-surface-muted px-3 py-2 text-sm text-slate-600">
        يتم الإرسال التلقائي حوالي الساعة{" "}
        <span className="ltr-field font-medium">{REPORT_SEND_HOUR_LABEL}</span>{" "}
        صباحاً بتوقيت المغرب. لا يمكن تغيير هذه الساعة.
      </p>
    </section>
  );
}
