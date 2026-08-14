import { Suspense } from "react";

import { MobileNav } from "@/components/layout/mobile-nav";
import { NavLinks } from "@/components/layout/nav-links";
import { ScrollReset } from "@/components/layout/scroll-reset";
import { UserBox } from "@/components/layout/user-box";
import { navItemsForRole } from "@/lib/constants";
import { APP_SCROLL_ID } from "@/lib/scroll-lock";
import type { SessionUser } from "@/types";

/**
 * Coquille applicative : barre latérale à partir de `lg`, tiroir en dessous.
 *
 * Un seul défilement existe dans l'application, celui de `<main>`. La coquille
 * occupe exactement la hauteur de la fenêtre (`h-dvh`) et interdit tout
 * débordement : la page elle-même ne défile donc jamais, et la barre latérale
 * reste visible quelle que soit la longueur du contenu.
 *
 * `h-dvh` plutôt que `h-screen` : sur mobile, `vh` ignore la barre d'adresse
 * du navigateur et la coquille dépasserait du bas de l'écran.
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
    <div className="flex h-dvh overflow-hidden">
      {/*
        La barre est un élément de la grille flex, pas un élément `fixed` : sa
        place est donc réservée par la mise en page, sans décalage à compenser
        sur le contenu. En RTL, l'ordre du flux la met naturellement à droite —
        aucun `right`/`left` codé en dur, donc rien à inverser.
        `border-e` trace la bordure du côté intérieur (à gauche en RTL).
      */}
      <aside className="hidden w-64 shrink-0 flex-col border-e border-line bg-surface p-3 lg:flex">
        <div className="px-3 py-4">
          <span className="text-lg font-bold">تدبير الناخبين</span>
        </div>
        {/* Défilement propre à la barre : une navigation plus haute que la
            fenêtre reste atteignable sans faire défiler la page. */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <NavLinks items={items} />
        </div>
        <UserBox user={user} />
      </aside>

      {/* `min-w-0` : sans lui, un tableau large empêcherait le flex de rétrécir
          et provoquerait un débordement horizontal de la page. */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* `shrink-0` remplace l'ancien `sticky` : l'en-tête est hors du
            conteneur défilant, il ne peut plus partir vers le haut. */}
        <header className="flex shrink-0 items-center gap-2 border-b border-line bg-surface px-2 py-2 lg:hidden">
          <MobileNav items={items} footer={<UserBox user={user} />} />
          <span className="font-bold">تدبير الناخبين</span>
        </header>

        <main
          id={APP_SCROLL_ID}
          className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8"
        >
          {/* `useSearchParams` impose une frontière de suspense. */}
          <Suspense fallback={null}>
            <ScrollReset />
          </Suspense>
          {children}
        </main>
      </div>
    </div>
  );
}
