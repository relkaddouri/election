import Link from "next/link";

import { requireUser } from "@/lib/auth";
import { homeRouteForRole, ROLE_LABELS } from "@/lib/constants";

export default async function AccesRefusePage() {
  const user = await requireUser();

  return (
    <div className="mx-auto max-w-md py-10 text-center">
      <h1 className="text-xl font-bold sm:text-2xl">لا تملك صلاحية الوصول</h1>
      <p className="mt-2 text-slate-600">
        دورك الحالي ({ROLE_LABELS[user.role]}) لا يسمح بفتح هذه الصفحة.
      </p>
      <Link
        href={homeRouteForRole(user.role)}
        className="mt-6 inline-flex min-h-touch items-center rounded-lg bg-brand-600 px-4 font-medium text-white hover:bg-brand-700"
      >
        العودة إلى الصفحة الرئيسية
      </Link>
    </div>
  );
}
