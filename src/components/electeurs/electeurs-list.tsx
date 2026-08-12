import Link from "next/link";

import type { ElecteurWithOrder } from "@/types";

/**
 * Liste des électeurs : cartes empilées sur mobile, tableau sur desktop.
 *
 * `order_number` (رقم الترتيب) vient de la vue `electeurs_ordered` : il est
 * calculé par cadre, jamais stocké.
 */
export function ElecteursList({
  electeurs,
  canEdit,
}: {
  electeurs: ElecteurWithOrder[];
  canEdit: boolean;
}) {
  if (electeurs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-surface p-8 text-center">
        <p className="font-medium">لا يوجد أي ناخب</p>
        <p className="mt-1 text-sm text-slate-500">
          غيّر كلمات البحث أو أضف ناخباً جديداً
        </p>
      </div>
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-3 lg:hidden">
        {electeurs.map((electeur) => (
          <li
            key={electeur.id}
            className="rounded-xl border border-line bg-surface p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold">{electeur.full_name}</p>
                <p className="mt-0.5 truncate text-sm text-slate-500">
                  {electeur.cadre_full_name}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-surface-muted px-2 py-0.5 ltr-field text-sm text-slate-600">
                #{electeur.order_number}
              </span>
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
              <div>
                <dt className="text-slate-500">رقم البطاقة</dt>
                <dd className="ltr-field">{electeur.cin}</dd>
              </div>
              <div>
                <dt className="text-slate-500">الهاتف</dt>
                <dd className="ltr-field">{electeur.phone}</dd>
              </div>
              <div>
                <dt className="text-slate-500">مكتب التصويت</dt>
                <dd className="ltr-field">{electeur.polling_station_number}</dd>
              </div>
              <div>
                <dt className="text-slate-500">مكان التصويت</dt>
                <dd className="truncate">{electeur.polling_location}</dd>
              </div>
            </dl>

            {canEdit && (
              <Link
                href={`/electeurs/${electeur.id}/modifier`}
                className="mt-3 inline-flex min-h-touch items-center font-medium text-brand-700 hover:underline"
              >
                تعديل
              </Link>
            )}
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto rounded-xl border border-line bg-surface lg:block">
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-surface-muted">
            <tr>
              <th className="p-3 text-start font-semibold">رقم الترتيب</th>
              <th className="p-3 text-start font-semibold">رقم البطاقة</th>
              <th className="p-3 text-start font-semibold">الاسم الكامل</th>
              <th className="p-3 text-start font-semibold">رقم الهاتف</th>
              <th className="p-3 text-start font-semibold">مكتب التصويت</th>
              <th className="p-3 text-start font-semibold">مكان التصويت</th>
              <th className="p-3 text-start font-semibold">المؤطر</th>
              {canEdit && (
                <th className="p-3 text-start font-semibold">إجراء</th>
              )}
            </tr>
          </thead>
          <tbody>
            {electeurs.map((electeur) => (
              <tr
                key={electeur.id}
                className="border-b border-line last:border-0 hover:bg-surface-muted"
              >
                <td className="p-3 ltr-field">{electeur.order_number}</td>
                <td className="p-3 ltr-field">{electeur.cin}</td>
                <td className="p-3 font-medium">{electeur.full_name}</td>
                <td className="p-3 ltr-field">{electeur.phone}</td>
                <td className="p-3 ltr-field">
                  {electeur.polling_station_number}
                </td>
                <td className="p-3">{electeur.polling_location}</td>
                <td className="p-3">
                  <Link
                    href={`/cadres/${electeur.cadre_id}`}
                    className="text-brand-700 hover:underline"
                  >
                    {electeur.cadre_full_name}
                  </Link>
                </td>
                {canEdit && (
                  <td className="p-3">
                    <Link
                      href={`/electeurs/${electeur.id}/modifier`}
                      className="font-medium text-brand-700 hover:underline"
                    >
                      تعديل
                    </Link>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
