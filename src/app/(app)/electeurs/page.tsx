import { PageHeader, PlaceholderCard } from "@/components/layout/page-header";
import { requireRole } from "@/lib/auth";

export default async function ElecteursPage() {
  await requireRole(["super_admin", "saisie", "parlementaire"]);

  return (
    <>
      <PageHeader
        title="الناخبون"
        description="البحث والتصفية حسب المؤطر ومكتب التصويت ومكان التصويت"
      />
      <PlaceholderCard step="تدبير الناخبين — المرحلتان 5 و6 من دفتر التحملات" />
    </>
  );
}
