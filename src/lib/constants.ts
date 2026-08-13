import type { UserRole } from "@/types/database";

/** Libellés arabes des rôles (cf. sections 17-19 du cahier des charges). */
export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "مدير عام",
  saisie: "مستخدم الإدخال",
  parlementaire: "برلماني",
};

export const ROLE_BADGES: Record<UserRole, string> = {
  super_admin: "👑",
  saisie: "✍️",
  parlementaire: "👁️",
};

/** Rôles en lecture seule : aucune écriture ne doit leur être proposée. */
export const READ_ONLY_ROLES: readonly UserRole[] = ["parlementaire"];

export function isReadOnly(role: UserRole): boolean {
  return READ_ONLY_ROLES.includes(role);
}

export type NavItem = {
  /** Libellé affiché, en arabe. */
  label: string;
  href: string;
  /** Rôles autorisés à voir l'entrée et à accéder à la route. */
  roles: readonly UserRole[];
};

const ALL_ROLES: readonly UserRole[] = [
  "super_admin",
  "saisie",
  "parlementaire",
];

/**
 * Navigation principale — barre latérale sur desktop, tiroir sur mobile.
 *
 * `roles` sert à la fois à filtrer l'affichage et à autoriser la route :
 * les deux ne peuvent donc pas diverger.
 *
 * Le tableau de bord est réservé au super_admin et au parlementaire (le brief
 * ne prévoit de statistiques que pour eux) ; un utilisateur « saisie » démarre
 * directement sur la liste des électeurs.
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { label: "الرئيسية", href: "/", roles: ["super_admin", "parlementaire"] },
  { label: "المؤطرون", href: "/cadres", roles: ALL_ROLES },
  { label: "الناخبون", href: "/electeurs", roles: ALL_ROLES },
  { label: "المستخدمون", href: "/utilisateurs", roles: ["super_admin"] },
  {
    label: "التقارير",
    href: "/rapports",
    roles: ["super_admin", "parlementaire"],
  },
  { label: "الإعدادات", href: "/parametres", roles: ["super_admin"] },
  // Absent de la liste du cahier des charges (section 3) : le journal y est
  // demandé sans emplacement précis. Une entrée dédiée vaut mieux que de
  // l'enterrer dans les réglages.
  { label: "سجل العمليات", href: "/journal", roles: ["super_admin"] },
];

export function navItemsForRole(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}

/**
 * Page d'atterrissage après connexion.
 *
 * Doit toujours pointer vers une route que le rôle peut réellement ouvrir,
 * sinon `requireRole` renverrait l'utilisateur en boucle.
 */
export function homeRouteForRole(role: UserRole): string {
  return role === "saisie" ? "/electeurs" : "/";
}

/** Route vers laquelle renvoyer un utilisateur dont le rôle est insuffisant. */
export const ACCESS_DENIED_ROUTE = "/acces-refuse";

/** Routes accessibles sans session. */
export const PUBLIC_ROUTES: readonly string[] = ["/login"];

/** Taille de page par défaut des listes d'électeurs. */
export const DEFAULT_PAGE_SIZE = 25;

/** Délai d'anti-rebond de la vérification CIN en temps réel (ms). */
export const CIN_CHECK_DEBOUNCE_MS = 400;

/**
 * Message de doublon imposé par le cahier des charges (sections 15-16).
 *
 * Défini ici et non dans `actions/electeurs.ts` : un module `"use server"` ne
 * peut exporter que des fonctions asynchrones.
 */
export const ELECTEUR_DUPLICATE_MESSAGE = "هذا الناخب مسجل مسبقاً في النظام";

/**
 * Libellés du journal d'audit.
 *
 * Indexés par chaîne et non par union de types : `audit_logs.action` est une
 * colonne texte libre, et une valeur écrite par une version antérieure du code
 * doit rester affichable plutôt que de faire planter la page.
 */
export const AUDIT_ACTION_LABELS: Record<string, string> = {
  create: "إضافة",
  update: "تعديل",
  delete: "حذف",
  login: "تسجيل دخول",
  export: "تصدير",
};

export const AUDIT_ENTITY_LABELS: Record<string, string> = {
  cadre: "مؤطر",
  electeur: "ناخب",
  user: "مستخدم",
  settings: "إعدادات",
};
