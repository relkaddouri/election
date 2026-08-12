import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Compose des classes Tailwind en résolvant les conflits. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Convertit les chiffres arabo-indiens (٠١٢…) saisis au clavier arabe en
 * chiffres occidentaux, pour que CIN et téléphones restent comparables en base.
 */
export function toWesternDigits(value: string): string {
  return value
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

/** Normalise un CIN pour la comparaison d'unicité : majuscules, sans espaces. */
export function normalizeCin(value: string): string {
  return toWesternDigits(value).replace(/\s+/g, "").toUpperCase();
}
