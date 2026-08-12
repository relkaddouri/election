import Link from "next/link";

import { CadresList } from "@/components/cadres/cadres-list";
import { PageHeader } from "@/components/layout/page-header";
import { SearchInput } from "@/components/ui/search-input";
import { requireRole } from "@/lib/auth";
import { listCadres } from "@/lib/data/cadres";

export default async function CadresPage({
  searchParams,
}: PageProps<"/cadres">) {
  const user = await requireRole(["super_admin", "saisie", "parlementaire"]);
  const { q } = await searchParams;
  const search = typeof q === "string" ? q : undefined;

  const cadres = await listCadres({ search });

  // Le RLS autorise l'insertion aux seuls super_admin : proposer le bouton aux
  // autres rôles ne mènerait qu'à une erreur.
  const canCreate = user.role === "super_admin";

  return (
    <>
      <PageHeader
        title="المؤطرون"
        description="عدد الناخبين محتسب تلقائياً لكل مؤطر"
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <SearchInput
            label="البحث في المؤطرين"
            placeholder="ابحث بالاسم أو رقم البطاقة أو الهاتف أو مكان التصويت"
          />
        </div>
        {canCreate && (
          <Link
            href="/cadres/nouveau"
            className="inline-flex min-h-touch items-center justify-center rounded-lg bg-brand-600 px-4 font-medium text-white hover:bg-brand-700"
          >
            إضافة مؤطر
          </Link>
        )}
      </div>

      <p className="mb-3 text-sm text-slate-600">
        عدد النتائج : <span className="ltr-field">{cadres.length}</span>
      </p>

      <CadresList cadres={cadres} />
    </>
  );
}
