import Link from "next/link";

import type { CadreShare } from "@/lib/data/stats";
import { formatNumber } from "@/lib/utils";

/**
 * Répartition des électeurs par cadre.
 *
 * Comparaison de magnitudes sur une seule série : barres horizontales, une
 * teinte unique. Une palette catégorielle serait ici trompeuse — elle
 * suggérerait que la couleur porte une information, alors que seule la
 * longueur compte. Pas de légende non plus : il n'y a qu'une série, le titre
 * suffit.
 *
 * Les barres sont ancrées côté `start`, donc à droite en RTL, et grandissent
 * vers la gauche — sens de lecture naturel de l'interface.
 */
export function CadreDistribution({
  distribution,
  total,
}: {
  distribution: CadreShare[];
  total: number;
}) {
  if (distribution.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-surface p-8 text-center">
        <p className="font-medium">لا توجد بيانات لعرضها</p>
        <p className="mt-1 text-sm text-slate-500">أضف مؤطرين وناخبين أولاً</p>
      </div>
    );
  }

  // Les barres sont mises à l'échelle du plus grand cadre, non du total : sinon
  // une répartition équilibrée entre dix cadres donnerait dix barres écrasées,
  // illisibles.
  const max = Math.max(...distribution.map((c) => c.count), 1);

  return (
    <div className="rounded-xl border border-line bg-surface p-4 sm:p-6">
      <h2 className="font-semibold">توزيع الناخبين حسب المؤطر</h2>
      <p className="mt-1 text-sm text-slate-600">
        من أصل <span className="ltr-field">{formatNumber(total)}</span> ناخباً
      </p>

      <ul className="mt-5 flex flex-col gap-4">
        {distribution.map((cadre) => (
          <li key={cadre.id}>
            <div className="flex items-baseline justify-between gap-3">
              <Link
                href={`/cadres/${cadre.id}`}
                className="truncate font-medium hover:underline"
              >
                {cadre.fullName}
              </Link>
              {/* Valeur en bout de barre : elle porte le chiffre exact, ce qui
                  évite d'ajouter un axe gradué. */}
              <span className="shrink-0 text-sm text-slate-600">
                <span className="ltr-field font-semibold text-slate-900">
                  {formatNumber(cadre.count)}
                </span>{" "}
                <span className="ltr-field">
                  ({cadre.share.toFixed(1).replace(/\.0$/, "")}%)
                </span>
              </span>
            </div>

            <div
              className="mt-1.5 h-3 w-full overflow-hidden rounded-full bg-surface-muted"
              role="img"
              aria-label={`${cadre.fullName} : ${cadre.count} ناخباً`}
            >
              <div
                className="h-full rounded-full bg-brand-600"
                style={{ width: `${(cadre.count / max) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Même donnée, forme tabulaire.
 *
 * Le brief demande tableau *et* graphique. C'est aussi le recours
 * d'accessibilité : les valeurs exactes restent atteignables sans avoir à
 * comparer des longueurs de barres.
 */
export function CadreDistributionTable({
  distribution,
  total,
}: {
  distribution: CadreShare[];
  total: number;
}) {
  if (distribution.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface">
      <table className="w-full text-sm">
        <caption className="p-4 text-start font-semibold">
          تفصيل التوزيع
        </caption>
        <thead className="border-b border-line bg-surface-muted">
          <tr>
            <th scope="col" className="p-3 text-start font-semibold">
              المؤطر
            </th>
            <th scope="col" className="p-3 text-start font-semibold">
              عدد الناخبين
            </th>
            <th scope="col" className="p-3 text-start font-semibold">
              النسبة
            </th>
          </tr>
        </thead>
        <tbody>
          {distribution.map((cadre) => (
            <tr key={cadre.id} className="border-b border-line last:border-0">
              <td className="p-3">
                <Link
                  href={`/cadres/${cadre.id}`}
                  className="font-medium text-brand-700 hover:underline"
                >
                  {cadre.fullName}
                </Link>
              </td>
              <td className="p-3 ltr-field">{formatNumber(cadre.count)}</td>
              <td className="p-3 ltr-field">
                {cadre.share.toFixed(1).replace(/\.0$/, "")}%
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t-2 border-line bg-surface-muted font-semibold">
          <tr>
            <td className="p-3">المجموع</td>
            <td className="p-3 ltr-field">{formatNumber(total)}</td>
            <td className="p-3 ltr-field">100%</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
