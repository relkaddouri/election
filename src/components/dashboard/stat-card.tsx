import { formatNumber } from "@/lib/utils";

/**
 * Tuile de statistique.
 *
 * Un chiffre isolé ne mérite pas un graphique : la valeur brute, en grand, se
 * lit plus vite qu'une barre à décoder.
 */
export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4 sm:p-5">
      <p className="text-sm text-slate-600">{label}</p>
      {/* `ltr-field` : les chiffres restent lus de gauche à droite, et
          `tabular-nums` évite que la largeur saute d'un chiffre à l'autre. */}
      <p className="mt-2 ltr-field text-3xl font-bold sm:text-4xl">
        {formatNumber(value)}
      </p>
      {hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}
    </div>
  );
}
