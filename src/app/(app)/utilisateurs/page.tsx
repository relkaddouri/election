import { PageHeader, PlaceholderCard } from "@/components/layout/page-header";
import { requireRole } from "@/lib/auth";

export default async function UtilisateursPage() {
  // Réservé au super_admin : un « saisie » ne doit pas atteindre cette page.
  await requireRole(["super_admin"]);

  return (
    <>
      <PageHeader
        title="المستخدمون"
        description="إنشاء المستخدمين وتحديد أدوارهم وربطهم بالمؤطرين"
      />
      <PlaceholderCard step="تدبير المستخدمين — المرحلة 9 من دفتر التحملات" />
    </>
  );
}
