import Link from "next/link";

/**
 * Pagination rendue en liens serveur : elle fonctionne sans JavaScript, chaque
 * page est adressable, et le bouton retour du navigateur se comporte comme
 * l'utilisateur l'attend.
 */
export function Pagination({
  page,
  pageSize,
  total,
  searchParams,
  basePath,
}: {
  page: number;
  pageSize: number;
  total: number;
  /** Paramètres courants, préservés d'une page à l'autre. */
  searchParams: Record<string, string | string[] | undefined>;
  basePath: string;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (pageCount <= 1) return null;

  const href = (target: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (key === "page") continue;
      if (typeof value === "string" && value) params.set(key, value);
    }
    if (target > 1) params.set("page", String(target));
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  const linkClass =
    "inline-flex min-h-touch items-center rounded-lg border border-line px-4 font-medium hover:bg-surface-muted";
  const disabledClass =
    "inline-flex min-h-touch cursor-not-allowed items-center rounded-lg border border-line px-4 font-medium opacity-40";

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <nav
      aria-label="تصفّح النتائج"
      className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-between"
    >
      <p className="text-sm text-slate-600">
        <span className="ltr-field">{first}</span>–
        <span className="ltr-field">{last}</span> من أصل{" "}
        <span className="ltr-field">{total}</span>
      </p>

      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link href={href(page - 1)} className={linkClass} rel="prev">
            السابق
          </Link>
        ) : (
          <span className={disabledClass} aria-disabled="true">
            السابق
          </span>
        )}

        <span className="px-2 text-sm text-slate-600">
          <span className="ltr-field">{page}</span> /{" "}
          <span className="ltr-field">{pageCount}</span>
        </span>

        {page < pageCount ? (
          <Link href={href(page + 1)} className={linkClass} rel="next">
            التالي
          </Link>
        ) : (
          <span className={disabledClass} aria-disabled="true">
            التالي
          </span>
        )}
      </div>
    </nav>
  );
}
