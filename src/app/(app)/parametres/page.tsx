import { PageHeader, PlaceholderCard } from "@/components/layout/page-header";
import { requireRole } from "@/lib/auth";

export default async function ParametresPage() {
  // Réservé au super_admin : un « saisie » ne doit pas atteindre cette page.
  await requireRole(["super_admin"]);

  return (
    <>
      <PageHeader
        title="الإعدادات"
        description="اسم الحزب والجماعة الترابية وشعار الحزب"
      />
      <PlaceholderCard step="الإعدادات — المرحلة 9 من دفتر التحملات" />
    </>
  );
}
