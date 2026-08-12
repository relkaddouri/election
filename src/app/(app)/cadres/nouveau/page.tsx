import { CadreForm } from "@/components/cadres/cadre-form";
import { PageHeader } from "@/components/layout/page-header";
import { createCadre } from "@/lib/actions/cadres";
import { requireRole } from "@/lib/auth";

export default async function NouveauCadrePage() {
  // Aligné sur la policy RLS `cadres_insert`.
  await requireRole(["super_admin"]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="إضافة مؤطر"
        description="الحقول المعلَّمة بـ * إجبارية"
      />
      <div className="rounded-xl border border-line bg-surface p-4 sm:p-6">
        <CadreForm action={createCadre} submitLabel="حفظ المؤطر" />
      </div>
    </div>
  );
}
