import type { Electeur } from "@/types";

/**
 * Électeurs d'un cadre : cartes sur mobile, tableau sur desktop.
 *
 * `رقم الترتيب` est calculé à l'affichage à partir du rang dans la liste — il
 * n'est jamais stocké, donc jamais troué par une suppression.
 */
export function ElecteursMiniList({ electeurs }: { electeurs: Electeur[] }) {
  if (electeurs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-surface p-8 text-center">
        <p className="font-medium">لا يوجد أي ناخب</p>
        <p className="mt-1 text-sm text-slate-500">
          لم يُسجَّل أي ناخب لدى هذا المؤطر بعد
        </p>
      </div>
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-3 lg:hidden">
        {electeurs.map((electeur, index) => (
          <li
            key={electeur.id}
            className="rounded-xl border border-line bg-surface p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="font-semibold">{electeur.full_name}</span>
              <span className="ltr-field text-sm text-slate-500">
                #{index + 1}
              </span>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
              <div>
                <dt className="text-slate-500">رقم البطاقة</dt>
                <dd className="ltr-field">{electeur.cin}</dd>
              </div>
              <div>
                <dt className="text-slate-500">الهاتف</dt>
                <dd className="ltr-field">{electeur.phone ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">مكتب التصويت</dt>
                <dd className="ltr-field">
                  {electeur.polling_station_number ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">مكان التصويت</dt>
                <dd className="truncate">{electeur.polling_location ?? "—"}</dd>
              </div>
            </dl>
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
            </tr>
          </thead>
          <tbody>
            {electeurs.map((electeur, index) => (
              <tr
                key={electeur.id}
                className="border-b border-line last:border-0"
              >
                <td className="p-3 ltr-field">{index + 1}</td>
                <td className="p-3 ltr-field">{electeur.cin}</td>
                <td className="p-3 font-medium">{electeur.full_name}</td>
                <td className="p-3 ltr-field">{electeur.phone ?? "—"}</td>
                <td className="p-3 ltr-field">
                  {electeur.polling_station_number ?? "—"}
                </td>
                <td className="p-3">{electeur.polling_location ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
