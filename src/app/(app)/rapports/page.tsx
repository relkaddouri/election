import { PageHeader, PlaceholderCard } from "@/components/layout/page-header";
import { requireRole } from "@/lib/auth";

export default async function RapportsPage() {
  await requireRole(["super_admin", "parlementaire"]);

  return (
    <>
      <PageHeader
        title="التقارير"
        description="تصدير PDF لكل مؤطر وتصدير Excel الشامل"
      />
      <PlaceholderCard step="التقارير — المرحلة 8 من دفتر التحملات" />
    </>
  );
}
