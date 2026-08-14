import { PageHeader } from "@/components/layout/page-header";
import { CreateUserPanel } from "@/components/users/create-user-panel";
import { UserCard } from "@/components/users/user-card";
import { requireRole } from "@/lib/auth";
import { listUsers } from "@/lib/data/users";

export default async function UtilisateursPage() {
  // Réservé au super_admin : un « saisie » ne doit pas atteindre cette page.
  const current = await requireRole(["super_admin"]);

  const users = await listUsers();

  return (
    <>
      <PageHeader
        title="المستخدمون"
        description="إنشاء الحسابات وتحديد الأدوار"
      />

      <CreateUserPanel />

      <p className="mb-3 text-sm text-slate-600">
        عدد المستخدمين : <span className="ltr-field">{users.length}</span>
      </p>

      <ul className="flex flex-col gap-3">
        {users.map((user) => (
          <UserCard key={user.id} user={user} isSelf={user.id === current.id} />
        ))}
      </ul>
    </>
  );
}
