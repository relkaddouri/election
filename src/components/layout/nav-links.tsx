"use client";

import {
  FileText,
  LayoutDashboard,
  ScrollText,
  Settings,
  UserCheck,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import type { NavIcon, NavItem } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Résolution des clés d'icônes.
 *
 * Le typage par `Record<NavIcon, …>` impose d'ajouter l'icône en même temps
 * que l'entrée de navigation : oublier l'une fait échouer la compilation
 * plutôt que d'afficher un libellé nu.
 */
const ICONS: Record<NavIcon, LucideIcon> = {
  dashboard: LayoutDashboard,
  cadres: Users,
  electeurs: UserCheck,
  users: UserCog,
  reports: FileText,
  settings: Settings,
  journal: ScrollText,
};

/** `/cadres/123` doit garder « المؤطرون » actif, mais `/` ne l'est qu'exactement. */
function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function NavLinks({
  items,
  onNavigate,
}: {
  items: readonly NavItem[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="التنقل الرئيسي">
      <ul className="flex flex-col gap-1">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = ICONS[item.icon];

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-touch items-center gap-3 rounded-lg px-3 font-medium transition-colors",
                  active
                    ? "bg-brand-600 text-white"
                    : "text-slate-700 hover:bg-surface-muted",
                )}
              >
                {/*
                  Premier enfant du flux : en RTL, il se place donc à droite du
                  libellé, du côté où commence la lecture. Aucune règle
                  directionnelle à écrire — l'ordre du DOM suffit.

                  `aria-hidden` : l'icône double le libellé, l'annoncer une
                  seconde fois n'apporterait rien. `shrink-0` l'empêche d'être
                  écrasée par un libellé long.
                */}
                <Icon aria-hidden="true" className="size-5 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
