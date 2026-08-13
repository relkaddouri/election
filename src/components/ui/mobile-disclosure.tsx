"use client";

import { useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Contenu secondaire : repliable sur mobile, toujours visible à partir de `sm`.
 *
 * `<details>` ne convient pas ici : son ouverture dépend de l'attribut `open`,
 * que le CSS ne peut pas piloter — il aurait fallu le même état sur toutes les
 * tailles d'écran. Ici, `hidden sm:grid` rend le contenu inconditionnellement
 * visible sur grand écran, quel que soit l'état du bouton, qui n'existe que
 * sur mobile.
 */
export function MobileDisclosure({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex min-h-touch w-full items-center justify-between font-medium text-slate-700 sm:hidden"
      >
        <span>{label}</span>
        <span className="text-sm text-slate-500">{open ? "إخفاء" : "عرض"}</span>
      </button>

      <div
        className={cn(
          "grid gap-4 sm:grid-cols-2",
          open ? "grid" : "hidden sm:grid",
        )}
      >
        {children}
      </div>
    </div>
  );
}
