import Link from "next/link";

import { ElecteursFilters } from "@/components/electeurs/electeurs-filters";
import { ElecteursList } from "@/components/electeurs/electeurs-list";
import { PageHeader } from "@/components/layout/page-header";
import { ResetFiltersLink } from "@/components/ui/filter-select";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { requireRole } from "@/lib/auth";
import { isReadOnly } from "@/lib/constants";
import { listCadres } from "@/lib/data/cadres";
import { getElecteurFilterOptions, listElecteurs } from "@/lib/data/electeurs";

/** Lit un paramètre d'URL en ignorant les valeurs répétées (`?q=a&q=b`). */
function param(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

export default async function ElecteursPage({
  searchParams,
}: PageProps<"/electeurs">) {
  const user = await requireRole(["super_admin", "saisie", "parlementaire"]);
  const resolved = await searchParams;

  const search = param(resolved.q);
  const cadreId = param(resolved.cadre);
  const pollingStation = param(resolved.bureau);
  const pollingLocation = param(resolved.lieu);
  const page = Number(param(resolved.page) ?? "1") || 1;

  const [result, cadres, filterOptions] = await Promise.all([
    listElecteurs({
      search,
      cadreId,
      pollingStation,
      pollingLocation,
      page,
    }),
    listCadres({}),
    // Restreint aux valeurs du cadre sélectionné : les filtres se combinent
    // sans jamais proposer d'option menant à zéro résultat.
    getElecteurFilterOptions(cadreId),
  ]);

  const canEdit = !isReadOnly(user.role);
  const filtersActive = Boolean(
    search || cadreId || pollingStation || pollingLocation,
  );

  return (
    <>
      <PageHeader
        title="الناخبون"
        description="رقم الترتيب يُحتسب تلقائياً داخل كل مؤطر"
      />

      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1">
            <SearchInput
              label="البحث في الناخبين"
              placeholder="ابحث بالاسم أو رقم البطاقة أو الهاتف"
            />
          </div>
          {canEdit && (
            <Link
              href="/electeurs/nouveau"
              className="inline-flex min-h-touch items-center justify-center rounded-lg bg-brand-600 px-4 font-medium text-white hover:bg-brand-700"
            >
              إضافة ناخب
            </Link>
          )}
        </div>

        <ElecteursFilters
          cadres={cadres.map((c) => ({ value: c.id, label: c.full_name }))}
          pollingStations={filterOptions.pollingStations}
          pollingLocations={filterOptions.pollingLocations}
        />
      </div>

      <div className="mb-3 flex items-center justify-between gap-3">
        {/* Le total porte sur l'ensemble des résultats, pas sur la page. */}
        <p className="text-sm text-slate-600">
          عدد النتائج : <span className="ltr-field">{result.total}</span>
        </p>
        <ResetFiltersLink active={filtersActive} />
      </div>

      <ElecteursList electeurs={result.rows} canEdit={canEdit} />

      <Pagination
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
        searchParams={resolved}
        basePath="/electeurs"
      />
    </>
  );
}
