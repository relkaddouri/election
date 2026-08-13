import { PageHeader } from "@/components/layout/page-header";
import { SettingsForm } from "@/components/settings/settings-form";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function ParametresPage() {
  // Aligné sur la policy RLS `settings_update`.
  await requireRole(["super_admin"]);

  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("settings")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (!settings) {
    return (
      <>
        <PageHeader title="الإعدادات" />
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          تعذّر تحميل الإعدادات.
        </p>
      </>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="الإعدادات"
        description="تظهر هذه المعطيات في ترويسة تقارير PDF وملفات Excel"
      />
      <div className="rounded-xl border border-line bg-surface p-4 sm:p-6">
        <SettingsForm settings={settings} />
      </div>
    </div>
  );
}
