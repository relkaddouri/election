import { redirect } from "next/navigation";

import {
  CadreDistribution,
  CadreDistributionTable,
} from "@/components/dashboard/cadre-distribution";
import { StatCard } from "@/components/dashboard/stat-card";
import { PageHeader } from "@/components/layout/page-header";
import { requireUser } from "@/lib/auth";
import { homeRouteForRole, isReadOnly, ROLE_LABELS } from "@/lib/constants";
import { getDashboardStats } from "@/lib/data/stats";

export default async function DashboardPage() {
  const user = await requireUser();

  // Un « saisie » n'a pas de tableau de bord : on le renvoie vers son écran
  // d'accueil plutôt que de lui opposer un refus d'accès.
  if (user.role === "saisie") redirect(homeRouteForRole(user.role));

  const stats = await getDashboardStats();

  return (
    <>
      <PageHeader
        title="الرئيسية"
        description={`مرحباً ${user.fullName} — ${ROLE_LABELS[user.role]}`}
      />

      {isReadOnly(user.role) && (
        <p className="mb-5 rounded-lg bg-surface-muted px-3 py-2 text-sm text-slate-600">
          عرض للاطلاع فقط : لا يمكن تعديل أي بيانات من هذا الحساب.
        </p>
      )}

      {/* Empilées sur mobile, en grille dès `sm`. */}
      <section aria-label="أرقام عامة" className="grid gap-4 sm:grid-cols-3">
        <StatCard label="مجموع الناخبين" value={stats.totalElecteurs} />
        <StatCard label="مجموع المؤطرين" value={stats.totalCadres} />
        <StatCard label="مجموع المستخدمين" value={stats.totalUtilisateurs} />
      </section>

      <section aria-label="التوزيع حسب المؤطر" className="mt-6 grid gap-6">
        <CadreDistribution
          distribution={stats.distribution}
          total={stats.totalElecteurs}
        />
        <CadreDistributionTable
          distribution={stats.distribution}
          total={stats.totalElecteurs}
        />
      </section>
    </>
  );
}
