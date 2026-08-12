import { redirect } from "next/navigation";

import { PageHeader, PlaceholderCard } from "@/components/layout/page-header";
import { requireUser } from "@/lib/auth";
import { homeRouteForRole, ROLE_LABELS } from "@/lib/constants";

export default async function DashboardPage() {
  const user = await requireUser();

  // Un « saisie » n'a pas de tableau de bord : on le renvoie vers son écran
  // d'accueil plutôt que de lui opposer un refus d'accès.
  if (user.role === "saisie") redirect(homeRouteForRole(user.role));

  return (
    <>
      <PageHeader
        title="الرئيسية"
        description={`مرحباً ${user.fullName} — ${ROLE_LABELS[user.role]}`}
      />
      <PlaceholderCard step="لوحة المؤشرات — المرحلة 7 من دفتر التحملات" />
    </>
  );
}
