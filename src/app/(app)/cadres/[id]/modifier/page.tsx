import { notFound } from "next/navigation";

import { CadreForm } from "@/components/cadres/cadre-form";
import { PageHeader } from "@/components/layout/page-header";
import { updateCadre } from "@/lib/actions/cadres";
import { requireRole } from "@/lib/auth";
import { getCadre } from "@/lib/data/cadres";

export default async function ModifierCadrePage({
  params,
}: PageProps<"/cadres/[id]/modifier">) {
  // Un « saisie » peut corriger les cadres de son périmètre ; le RLS tranche
  // ligne par ligne, et `getCadre` renvoie null hors périmètre.
  await requireRole(["super_admin", "saisie"]);
  const { id } = await params;

  const cadre = await getCadre(id);
  if (!cadre) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="تعديل المؤطر" description={cadre.full_name} />
      <div className="rounded-xl border border-line bg-surface p-4 sm:p-6">
        <CadreForm
          action={updateCadre.bind(null, id)}
          cadre={cadre}
          submitLabel="حفظ التعديلات"
        />
      </div>
    </div>
  );
}
