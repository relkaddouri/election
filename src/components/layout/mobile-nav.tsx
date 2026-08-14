"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { NavLinks } from "@/components/layout/nav-links";
import type { NavItem } from "@/lib/constants";
import { lockAppScroll } from "@/lib/scroll-lock";

/**
 * Navigation en tiroir, affichée sous le point de rupture `lg`.
 *
 * `footer` reçoit le bloc utilisateur : c'est un Composant Serveur, il doit
 * donc être passé en prop plutôt qu'importé ici.
 */
export function MobileNav({
  items,
  footer,
}: {
  items: readonly NavItem[];
  footer: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Referme le tiroir dès que la route change — y compris sur un retour
  // navigateur, que le `onNavigate` des liens ne couvre pas.
  //
  // Ajustement pendant le rendu plutôt que dans un effet : c'est le motif
  // recommandé par React pour réinitialiser un état sur changement de prop, et
  // il évite le rendu intermédiaire avec le tiroir encore ouvert.
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;

    // Capturé maintenant : au moment du nettoyage, la ref pourrait déjà
    // pointer ailleurs.
    const trigger = triggerRef.current;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);

    // Empêche le défilement du contenu derrière le tiroir. Cible `<main>` et
    // non `body` : depuis que la coquille fige la barre latérale, c'est lui
    // qui porte le défilement.
    const unlockScroll = lockAppScroll();

    panelRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      unlockScroll();
      // Rend le focus au bouton d'ouverture plutôt que de le perdre en haut
      // du document.
      trigger?.focus();
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        aria-label="فتح القائمة"
        className="flex size-touch items-center justify-center rounded-lg text-slate-700 hover:bg-surface-muted lg:hidden"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="size-6"
        >
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {open && (
        <div className="lg:hidden">
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 animate-fade-in bg-slate-900/50"
          />
          <div
            id="mobile-nav-panel"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="القائمة الرئيسية"
            tabIndex={-1}
            className="fixed inset-y-0 start-0 z-50 flex w-72 max-w-[85vw] animate-drawer-in flex-col bg-surface shadow-xl outline-none"
          >
            <div className="flex items-center justify-between border-b border-line p-3">
              <span className="font-bold">تدبير الناخبين</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="إغلاق القائمة"
                className="flex size-touch items-center justify-center rounded-lg text-slate-700 hover:bg-surface-muted"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className="size-5"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              <NavLinks items={items} onNavigate={() => setOpen(false)} />
            </div>

            <div className="p-3">{footer}</div>
          </div>
        </div>
      )}
    </>
  );
}
