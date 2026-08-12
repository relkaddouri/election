import Link from "next/link";

import type { CadreWithCount } from "@/types";

function CountBadge({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-sm font-medium text-brand-800">
      <span className="ltr-field">{count}</span>
      <span>ناخب</span>
    </span>
  );
}

/**
 * Liste des cadres.
 *
 * Deux rendus distincts plutôt qu'un tableau à défilement horizontal : sur un
 * téléphone tenu à une main sur le terrain, une carte empilée reste lisible là
 * où un tableau à six colonnes force un défilement latéral.
 */
export function CadresList({ cadres }: { cadres: CadreWithCount[] }) {
  if (cadres.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-surface p-8 text-center">
        <p className="font-medium">لا يوجد أي مؤطر</p>
        <p className="mt-1 text-sm text-slate-500">
          غيّر كلمات البحث أو أضف مؤطراً جديداً
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile : cartes empilées */}
      <ul className="flex flex-col gap-3 lg:hidden">
        {cadres.map((cadre) => (
          <li key={cadre.id}>
            <Link
              href={`/cadres/${cadre.id}`}
              className="block rounded-xl border border-line bg-surface p-4 hover:border-brand-300"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="font-semibold">{cadre.full_name}</span>
                <CountBadge count={cadre.electeurs_count} />
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                <div>
                  <dt className="text-slate-500">رقم البطاقة</dt>
                  <dd className="ltr-field">{cadre.cin}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">الهاتف</dt>
                  <dd className="ltr-field">{cadre.phone ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">مكتب التصويت</dt>
                  <dd className="ltr-field">{cadre.polling_station_number}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">مكان التصويت</dt>
                  <dd className="truncate">{cadre.polling_location}</dd>
                </div>
              </dl>
            </Link>
          </li>
        ))}
      </ul>

      {/* Desktop : tableau. `overflow-x-auto` confine le défilement au tableau
          plutôt que de le laisser déborder sur la page entière. */}
      <div className="hidden overflow-x-auto rounded-xl border border-line bg-surface lg:block">
        <table className="w-full text-start text-sm">
          <thead className="border-b border-line bg-surface-muted">
            <tr>
              <th className="p-3 text-start font-semibold">الاسم الكامل</th>
              <th className="p-3 text-start font-semibold">رقم البطاقة</th>
              <th className="p-3 text-start font-semibold">الهاتف</th>
              <th className="p-3 text-start font-semibold">مكتب التصويت</th>
              <th className="p-3 text-start font-semibold">مكان التصويت</th>
              <th className="p-3 text-start font-semibold">عدد الناخبين</th>
            </tr>
          </thead>
          <tbody>
            {cadres.map((cadre) => (
              <tr
                key={cadre.id}
                className="border-b border-line last:border-0 hover:bg-surface-muted"
              >
                <td className="p-3">
                  <Link
                    href={`/cadres/${cadre.id}`}
                    className="font-medium text-brand-700 hover:underline"
                  >
                    {cadre.full_name}
                  </Link>
                </td>
                <td className="p-3 ltr-field">{cadre.cin}</td>
                <td className="p-3 ltr-field">{cadre.phone ?? "—"}</td>
                <td className="p-3 ltr-field">
                  {cadre.polling_station_number}
                </td>
                <td className="p-3">{cadre.polling_location}</td>
                <td className="p-3">
                  <CountBadge count={cadre.electeurs_count} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
