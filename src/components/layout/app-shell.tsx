import { MobileNav } from "@/components/layout/mobile-nav";
import { NavLinks } from "@/components/layout/nav-links";
import { UserBox } from "@/components/layout/user-box";
import { navItemsForRole } from "@/lib/constants";
import type { SessionUser } from "@/types";

/**
 * Coquille applicative : barre latérale à partir de `lg`, tiroir en dessous.
 *
 * La navigation est filtrée par rôle — une entrée invisible reste malgré tout
 * protégée par `requireRole()` sur la page et par le RLS côté base.
 */
export function AppShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const items = navItemsForRole(user.role);

  return (
    <div className="flex min-h-full flex-1">
      {/* En RTL, `border-e` trace la bordure du côté intérieur (à gauche). */}
      <aside className="hidden w-64 shrink-0 flex-col border-e border-line bg-surface p-3 lg:flex">
        <div className="px-3 py-4">
          <span className="text-lg font-bold">تدبير الناخبين</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          <NavLinks items={items} />
        </div>
        <UserBox user={user} />
      </aside>

      {/* `min-w-0` : sans lui, un tableau large empêcherait le flex de rétrécir
          et provoquerait un débordement horizontal de la page. */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-line bg-surface px-2 py-2 lg:hidden">
          <MobileNav items={items} footer={<UserBox user={user} />} />
          <span className="font-bold">تدبير الناخبين</span>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
