import { ElecteurForm } from "@/components/electeurs/electeur-form";
import { PageHeader } from "@/components/layout/page-header";
import { createElecteur } from "@/lib/actions/electeurs";
import { requireRole } from "@/lib/auth";
import { listCadres } from "@/lib/data/cadres";

export default async function NouveauElecteurPage({
  searchParams,
}: PageProps<"/electeurs/nouveau">) {
  // Le parlementaire est en lecture seule ; le RLS refuserait l'insertion.
  await requireRole(["super_admin", "saisie"]);
  const { cadre } = await searchParams;

  // Déjà filtrés par le RLS : un « saisie » ne peut proposer que ses cadres.
  const cadres = await listCadres({});

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="إضافة ناخب"
        description="الحقول المعلَّمة بـ * إجبارية"
      />
      <div className="rounded-xl border border-line bg-surface p-4 sm:p-6">
        <ElecteurForm
          action={createElecteur}
          cadres={cadres}
          defaultCadreId={typeof cadre === "string" ? cadre : undefined}
          submitLabel="حفظ الناخب"
        />
      </div>
    </div>
  );
}
