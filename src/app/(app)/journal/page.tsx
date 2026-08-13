import { PageHeader } from "@/components/layout/page-header";
import { FilterSelect, ResetFiltersLink } from "@/components/ui/filter-select";
import { Pagination } from "@/components/ui/pagination";
import { requireRole } from "@/lib/auth";
import { AUDIT_ACTION_LABELS, AUDIT_ENTITY_LABELS } from "@/lib/constants";
import { listAuditLogs } from "@/lib/data/audit";
import { formatNumber } from "@/lib/utils";

/** Date et heure en chiffres latins, cohérent avec le reste de l'application. */
const dateFormatter = new Intl.DateTimeFormat("ar-MA-u-nu-latn", {
  dateStyle: "short",
  timeStyle: "short",
});

export default async function JournalPage({
  searchParams,
}: PageProps<"/journal">) {
  // Aligné sur la policy RLS `audit_logs_select`.
  await requireRole(["super_admin"]);
  const resolved = await searchParams;

  const read = (value: string | string[] | undefined) =>
    typeof value === "string" && value ? value : undefined;

  const action = read(resolved.action);
  const entityType = read(resolved.entite);
  const page = Number(read(resolved.page) ?? "1") || 1;

  const result = await listAuditLogs({ page, action, entityType });
  const filtersActive = Boolean(action || entityType);

  return (
    <>
      <PageHeader
        title="سجل العمليات"
        description="سجل غير قابل للتعديل أو الحذف — حتى من طرف المدير العام"
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:max-w-xl">
        <FilterSelect
          paramName="action"
          label="نوع العملية"
          allLabel="كل العمليات"
          options={Object.entries(AUDIT_ACTION_LABELS).map(
            ([value, label]) => ({ value, label }),
          )}
        />
        <FilterSelect
          paramName="entite"
          label="العنصر"
          allLabel="كل العناصر"
          options={Object.entries(AUDIT_ENTITY_LABELS).map(
            ([value, label]) => ({ value, label }),
          )}
        />
      </div>

      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          عدد النتائج :{" "}
          <span className="ltr-field">{formatNumber(result.total)}</span>
        </p>
        <ResetFiltersLink active={filtersActive} />
      </div>

      {result.rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-surface p-8 text-center">
          <p className="font-medium">لا توجد أي عملية مسجلة</p>
        </div>
      ) : (
        <>
          {/* Cartes sur mobile */}
          <ul className="flex flex-col gap-3 lg:hidden">
            {result.rows.map((entry) => (
              <li
                key={entry.id}
                className="rounded-xl border border-line bg-surface p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="font-medium">
                    {AUDIT_ACTION_LABELS[entry.action] ?? entry.action}{" "}
                    <span className="text-slate-600">
                      —{" "}
                      {AUDIT_ENTITY_LABELS[entry.entityType] ??
                        entry.entityType}
                    </span>
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  {entry.userName ?? "مستخدم محذوف"}
                </p>
                <p className="mt-1 ltr-field text-sm text-slate-500">
                  {dateFormatter.format(new Date(entry.createdAt))}
                </p>
              </li>
            ))}
          </ul>

          {/* Tableau sur desktop */}
          <div className="hidden overflow-x-auto rounded-xl border border-line bg-surface lg:block">
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-surface-muted">
                <tr>
                  <th className="p-3 text-start font-semibold">التاريخ</th>
                  <th className="p-3 text-start font-semibold">المستخدم</th>
                  <th className="p-3 text-start font-semibold">العملية</th>
                  <th className="p-3 text-start font-semibold">العنصر</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b border-line last:border-0"
                  >
                    <td className="p-3 ltr-field">
                      {dateFormatter.format(new Date(entry.createdAt))}
                    </td>
                    <td className="p-3">{entry.userName ?? "مستخدم محذوف"}</td>
                    <td className="p-3 font-medium">
                      {AUDIT_ACTION_LABELS[entry.action] ?? entry.action}
                    </td>
                    <td className="p-3">
                      {AUDIT_ENTITY_LABELS[entry.entityType] ??
                        entry.entityType}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Pagination
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
        searchParams={resolved}
        basePath="/journal"
      />
    </>
  );
}
