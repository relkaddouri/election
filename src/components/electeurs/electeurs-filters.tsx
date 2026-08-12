"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { FilterSelect, type FilterOption } from "@/components/ui/filter-select";

/** Paramètres d'URL considérés comme des filtres (la recherche est à part). */
const FILTER_PARAMS = ["cadre", "bureau", "lieu"] as const;

function FilterControls({
  cadres,
  pollingStations,
  pollingLocations,
}: {
  cadres: FilterOption[];
  pollingStations: string[];
  pollingLocations: string[];
}) {
  return (
    <>
      <FilterSelect
        paramName="cadre"
        label="المؤطر"
        allLabel="كل المؤطرين"
        options={cadres}
      />
      <FilterSelect
        paramName="bureau"
        label="مكتب التصويت"
        allLabel="كل المكاتب"
        options={pollingStations}
      />
      <FilterSelect
        paramName="lieu"
        label="مكان التصويت"
        allLabel="كل الأماكن"
        options={pollingLocations}
      />
    </>
  );
}

/**
 * Filtres combinables.
 *
 * À partir de `lg`, ils sont affichés en permanence. En dessous, ils sont
 * repliés dans un tiroir : sur un téléphone, trois listes déroulantes en
 * permanence repousseraient les résultats hors de l'écran.
 */
export function ElecteursFilters({
  cadres,
  pollingStations,
  pollingLocations,
}: {
  cadres: FilterOption[];
  pollingStations: string[];
  pollingLocations: string[];
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const activeCount = FILTER_PARAMS.filter((param) =>
    searchParams.get(param),
  ).length;
  const hasQuery = Boolean(searchParams.get("q"));

  useEffect(() => {
    if (!open) return;

    const trigger = triggerRef.current;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      trigger?.focus();
    };
  }, [open]);

  /** Vide les filtres ET la recherche, en revenant à la première page. */
  function reset() {
    router.replace(pathname, { scroll: false });
    setOpen(false);
  }

  return (
    <>
      {/* Desktop : filtres toujours visibles */}
      <div className="hidden gap-3 lg:grid lg:grid-cols-3">
        <FilterControls
          cadres={cadres}
          pollingStations={pollingStations}
          pollingLocations={pollingLocations}
        />
      </div>

      {/* Mobile / tablette : bouton d'ouverture */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-controls="filters-panel"
        className="flex min-h-touch w-full items-center justify-center gap-2 rounded-lg border border-line bg-surface px-4 font-medium lg:hidden"
      >
        <span>الفلاتر</span>
        {activeCount > 0 && (
          <span className="rounded-full bg-brand-600 px-2 ltr-field text-sm text-white">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="lg:hidden">
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 animate-fade-in bg-slate-900/50"
          />
          <div
            id="filters-panel"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="الفلاتر"
            tabIndex={-1}
            className="fixed inset-y-0 start-0 z-50 flex w-80 max-w-[90vw] animate-drawer-in flex-col bg-surface shadow-xl outline-none"
          >
            <div className="flex items-center justify-between border-b border-line p-3">
              <span className="font-bold">الفلاتر</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="إغلاق الفلاتر"
                className="flex size-touch items-center justify-center rounded-lg hover:bg-surface-muted"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className="size-5"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
              <FilterControls
                cadres={cadres}
                pollingStations={pollingStations}
                pollingLocations={pollingLocations}
              />
            </div>

            <div className="flex flex-col gap-2 border-t border-line p-4">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="min-h-touch rounded-lg bg-brand-600 px-4 font-medium text-white hover:bg-brand-700"
              >
                عرض النتائج
              </button>
              {(activeCount > 0 || hasQuery) && (
                <button
                  type="button"
                  onClick={reset}
                  className="min-h-touch rounded-lg border border-line px-4 font-medium hover:bg-surface-muted"
                >
                  إعادة ضبط الفلاتر
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
