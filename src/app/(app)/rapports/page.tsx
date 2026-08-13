import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { requireRole } from "@/lib/auth";
import { listCadres } from "@/lib/data/cadres";
import { formatNumber } from "@/lib/utils";

export default async function RapportsPage() {
  const user = await requireRole(["super_admin", "parlementaire"]);
  const cadres = await listCadres({});

  return (
    <>
      <PageHeader
        title="التقارير"
        description="تصدير لوائح الناخبين بصيغة PDF أو Excel"
      />

      {user.role === "super_admin" && (
        <section className="mb-6 rounded-xl border border-line bg-surface p-4 sm:p-6">
          <h2 className="font-semibold">التصدير الشامل إلى Excel</h2>
          <p className="mt-1 text-sm text-slate-600">
            ملف واحد يحتوي على ورقة لكل مؤطر، مع لوائح ناخبيه كاملة.
          </p>
          <a
            href="/api/export/excel"
            className="mt-4 inline-flex min-h-touch items-center justify-center rounded-lg bg-brand-600 px-4 font-medium text-white hover:bg-brand-700"
          >
            تحميل ملف Excel
          </a>
        </section>
      )}

      <section className="rounded-xl border border-line bg-surface p-4 sm:p-6">
        <h2 className="font-semibold">تقرير PDF لكل مؤطر</h2>
        <p className="mt-1 text-sm text-slate-600">
          يتضمن ترويسة الحزب والجماعة الترابية ومعطيات المؤطر ولائحة ناخبيه.
        </p>

        {cadres.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">لا يوجد أي مؤطر بعد.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {cadres.map((cadre) => (
              <li
                key={cadre.id}
                className="flex flex-col gap-2 rounded-lg border border-line p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <Link
                    href={`/cadres/${cadre.id}`}
                    className="truncate font-medium hover:underline"
                  >
                    {cadre.full_name}
                  </Link>
                  <p className="text-sm text-slate-500">
                    <span className="ltr-field">
                      {formatNumber(cadre.electeurs_count)}
                    </span>{" "}
                    ناخباً
                  </p>
                </div>
                <a
                  href={`/api/cadres/${cadre.id}/pdf`}
                  className="inline-flex min-h-touch items-center justify-center rounded-lg border border-line px-4 font-medium hover:bg-surface-muted"
                >
                  تحميل PDF
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
