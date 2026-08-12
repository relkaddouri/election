import Link from "next/link";
import { notFound } from "next/navigation";

import { DeleteCadreButton } from "@/components/cadres/delete-cadre-button";
import { ElecteursMiniList } from "@/components/electeurs/electeurs-mini-list";
import { PageHeader } from "@/components/layout/page-header";
import { FilterSelect, ResetFiltersLink } from "@/components/ui/filter-select";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { requireRole } from "@/lib/auth";
import { isReadOnly } from "@/lib/constants";
import { getCadre } from "@/lib/data/cadres";
import { getElecteurFilterOptions, listElecteurs } from "@/lib/data/electeurs";

function InfoRow({
  label,
  value,
  ltr,
}: {
  label: string;
  value: string;
  ltr?: boolean;
}) {
  return (
    <div>
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className={ltr ? "ltr-field font-medium" : "font-medium"}>{value}</dd>
    </div>
  );
}

export default async function CadreDetailPage({
  params,
  searchParams,
}: PageProps<"/cadres/[id]">) {
  const user = await requireRole(["super_admin", "saisie", "parlementaire"]);
  const { id } = await params;
  const resolved = await searchParams;

  const read = (v: string | string[] | undefined) =>
    typeof v === "string" && v ? v : undefined;
  const search = read(resolved.q);
  const pollingStation = read(resolved.bureau);
  const pollingLocation = read(resolved.lieu);
  const page = Number(read(resolved.page) ?? "1") || 1;

  // `getCadre` renvoie null aussi bien pour un id inexistant que pour un cadre
  // hors périmètre RLS : dans les deux cas, 404 — ne pas révéler l'existence
  // d'un cadre auquel l'utilisateur n'a pas accès.
  const cadre = await getCadre(id);
  if (!cadre) notFound();

  // Même source paginée que la page « الناخبون » : le رقم الترتيب affiché est
  // celui calculé par la base, et non le rang dans la liste filtrée.
  const [result, filterOptions] = await Promise.all([
    listElecteurs({
      cadreId: id,
      search,
      pollingStation,
      pollingLocation,
      page,
    }),
    getElecteurFilterOptions(id),
  ]);

  const canEdit = !isReadOnly(user.role);
  const canDelete = user.role === "super_admin";
  const filtersActive = Boolean(search || pollingStation || pollingLocation);

  return (
    <>
      <nav className="mb-4 text-sm">
        <Link href="/cadres" className="text-brand-700 hover:underline">
          ← العودة إلى المؤطرين
        </Link>
      </nav>

      <PageHeader
        title={cadre.full_name}
        description={`عدد الناخبين : ${cadre.electeurs_count}`}
      />

      <section className="rounded-xl border border-line bg-surface p-4 sm:p-6">
        <h2 className="mb-4 font-semibold">معطيات المؤطر</h2>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoRow label="رقم البطاقة الوطنية" value={cadre.cin} ltr />
          <InfoRow label="رقم الهاتف" value={cadre.phone ?? "—"} ltr />
          <InfoRow
            label="رقم مكتب التصويت"
            value={cadre.polling_station_number}
            ltr
          />
          <InfoRow label="مكان التصويت" value={cadre.polling_location} />
        </dl>

        {canEdit && (
          <div className="mt-6 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row">
            <Link
              href={`/cadres/${cadre.id}/modifier`}
              className="inline-flex min-h-touch items-center justify-center rounded-lg bg-brand-600 px-4 font-medium text-white hover:bg-brand-700"
            >
              تعديل المؤطر
            </Link>
            {canDelete && (
              <DeleteCadreButton
                id={cadre.id}
                electeursCount={cadre.electeurs_count}
              />
            )}
          </div>
        )}
      </section>

      <section className="mt-8">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold">ناخبو هذا المؤطر</h2>
          {canEdit && (
            <Link
              href={`/electeurs/nouveau?cadre=${cadre.id}`}
              className="inline-flex min-h-touch items-center justify-center rounded-lg bg-brand-600 px-4 font-medium text-white hover:bg-brand-700"
            >
              إضافة ناخب
            </Link>
          )}
        </div>

        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-2">
            <SearchInput
              label="البحث في ناخبي المؤطر"
              placeholder="ابحث بالاسم أو رقم البطاقة أو الهاتف"
            />
          </div>
          <FilterSelect
            paramName="bureau"
            label="مكتب التصويت"
            allLabel="كل المكاتب"
            options={filterOptions.pollingStations}
          />
          <FilterSelect
            paramName="lieu"
            label="مكان التصويت"
            allLabel="كل الأماكن"
            options={filterOptions.pollingLocations}
          />
        </div>

        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-sm text-slate-600">
            عدد النتائج : <span className="ltr-field">{result.total}</span>
          </p>
          <ResetFiltersLink active={filtersActive} />
        </div>

        <ElecteursMiniList electeurs={result.rows} />

        <Pagination
          page={result.page}
          pageSize={result.pageSize}
          total={result.total}
          searchParams={resolved}
          basePath={`/cadres/${cadre.id}`}
        />
      </section>
    </>
  );
}
