"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";

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
  options: string[];
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
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
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
