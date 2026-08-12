import { notFound } from "next/navigation";

import { ElecteurForm } from "@/components/electeurs/electeur-form";
import { DeleteElecteurButton } from "@/components/electeurs/delete-electeur-button";
import { PageHeader } from "@/components/layout/page-header";
import { updateElecteur } from "@/lib/actions/electeurs";
import { requireRole } from "@/lib/auth";
import { listCadres } from "@/lib/data/cadres";
import { getElecteur } from "@/lib/data/electeurs";

export default async function ModifierElecteurPage({
  params,
}: PageProps<"/electeurs/[id]/modifier">) {
  const user = await requireRole(["super_admin", "saisie"]);
  const { id } = await params;

  const [electeur, cadres] = await Promise.all([
    getElecteur(id),
    listCadres({}),
  ]);
  // null aussi bien pour un id inexistant que hors périmètre RLS.
  if (!electeur) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="تعديل الناخب" description={electeur.full_name} />
      <div className="rounded-xl border border-line bg-surface p-4 sm:p-6">
        <ElecteurForm
          action={updateElecteur.bind(null, id)}
          cadres={cadres}
          electeur={electeur}
          submitLabel="حفظ التعديلات"
        />
      </div>

      {user.role === "super_admin" && (
        <div className="mt-6">
          <DeleteElecteurButton id={id} />
        </div>
      )}
    </div>
  );
}
