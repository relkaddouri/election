import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/**
 * Champ de saisie. `min-h-touch` (44px) garantit le confort tactile exigé
 * pour l'usage terrain.
 *
 * Pour un contenu latin au sein d'une page RTL (e-mail, CIN, téléphone),
 * passer `dir="ltr"` : le texte s'aligne alors naturellement à gauche.
 */
export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "min-h-touch w-full rounded-lg border border-line bg-surface px-3 text-base",
        "placeholder:text-slate-400",
        "focus:border-brand-600 focus:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-60",
        "aria-[invalid=true]:border-red-500",
        className,
      )}
      {...props}
    />
  );
}
