"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";

/**
 * Option de filtre. La forme courte (chaîne) sert quand la valeur envoyée dans
 * l'URL est aussi le libellé ; la forme objet est indispensable dès que les
 * deux diffèrent — filtrer par cadre envoie un identifiant, pas un nom.
 */
export type FilterOption = string | { value: string; label: string };

function toOption(option: FilterOption): { value: string; label: string } {
  return typeof option === "string" ? { value: option, label: option } : option;
}

/** Liste déroulante de filtre, synchronisée avec l'URL. */
export function FilterSelect({
  paramName,
  label,
  options,
  allLabel,
  className,
}: {
  paramName: string;
  label: string;
  options: FilterOption[];
  allLabel: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const value = searchParams.get(paramName) ?? "";

  function onChange(next: string) {
    const params = new URLSearchParams(searchParams);
    if (next) params.set(paramName, next);
    else params.delete(paramName);
    // Retour à la première page : rester sur la page 5 après avoir réduit les
    // résultats à trois lignes afficherait une page vide.
    params.delete("page");
    router.replace(`${pathname}?${params}`, { scroll: false });
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={paramName} className="text-sm font-medium">
        {label}
      </label>
      <select
        id={paramName}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-touch w-full rounded-lg border border-line bg-surface px-3 text-base"
      >
        <option value="">{allLabel}</option>
        {options
          .map(toOption)
          .map(({ value: optionValue, label: optionLabel }) => (
            <option key={optionValue} value={optionValue}>
              {optionLabel}
            </option>
          ))}
      </select>
    </div>
  );
}

/** Remet tous les filtres à zéro en vidant la query string. */
export function ResetFiltersLink({ active }: { active: boolean }) {
  const router = useRouter();
  const pathname = usePathname();

  if (!active) return null;

  return (
    <button
      type="button"
      onClick={() => router.replace(pathname, { scroll: false })}
      className="min-h-touch self-end px-3 font-medium text-brand-700 hover:underline"
    >
      إعادة ضبط الفلاتر
    </button>
  );
}
