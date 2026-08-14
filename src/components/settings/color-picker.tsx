"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { DEFAULT_PRIMARY_COLOR } from "@/lib/constants";

const HEX = /^#[0-9a-fA-F]{6}$/;

/**
 * Luminance relative, formule WCAG.
 *
 * Sert à savoir si le texte blanc des boutons restera lisible sur la couleur
 * choisie — une teinte trop claire donnerait une interface inutilisable, sans
 * que rien ne le signale au moment du choix.
 */
function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map((offset) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/** Contraste entre la couleur et le blanc, de 1 (nul) à 21 (maximal). */
function contrastWithWhite(hex: string): number {
  return 1.05 / (relativeLuminance(hex) + 0.05);
}

export function ColorPicker({ defaultValue }: { defaultValue: string | null }) {
  const [color, setColor] = useState(defaultValue ?? DEFAULT_PRIMARY_COLOR);

  const valid = HEX.test(color);
  const contrast = valid ? contrastWithWhite(color) : 21;
  // Seuil WCAG AA pour du texte normal. En dessous, le libellé blanc d'un
  // bouton devient difficile à lire.
  const tooLight = contrast < 4.5;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="primary_color_text" className="font-medium">
        اللون الأساسي للتطبيق
      </label>

      <div className="flex flex-wrap items-center gap-3">
        {/* Le champ natif porte la valeur envoyée : il garantit à lui seul le
            format `#rrggbb` attendu par la contrainte en base. */}
        <input
          type="color"
          name="primary_color"
          aria-label="اختيار اللون"
          value={valid ? color : DEFAULT_PRIMARY_COLOR}
          onChange={(event) => setColor(event.target.value)}
          className="size-touch shrink-0 cursor-pointer rounded-lg border border-line bg-surface p-1"
        />

        {/* Saisie manuelle pour coller un code de charte graphique. */}
        <Input
          id="primary_color_text"
          dir="ltr"
          value={color}
          onChange={(event) => setColor(event.target.value)}
          aria-invalid={!valid}
          className="w-32 shrink-0 uppercase"
        />

        <span
          className="inline-flex min-h-touch items-center rounded-lg px-4 font-medium text-white"
          style={{ backgroundColor: valid ? color : DEFAULT_PRIMARY_COLOR }}
        >
          معاينة
        </span>
      </div>

      {!valid && (
        <p role="alert" className="text-sm text-red-700">
          الصيغة غير صحيحة. استعمل رمزاً سداسياً مثل #1a73e8
        </p>
      )}

      {valid && tooLight && (
        <p role="alert" className="text-sm text-amber-800">
          هذا اللون فاتح جداً : النص الأبيض على الأزرار سيكون صعب القراءة (نسبة
          التباين {contrast.toFixed(1)} من 4.5 المطلوبة).
        </p>
      )}

      {valid && !tooLight && (
        <p className="text-sm text-slate-500">
          يُطبَّق على الأزرار والروابط النشطة وعناصر التمييز، وعلى صفحة الدخول.
        </p>
      )}
    </div>
  );
}
