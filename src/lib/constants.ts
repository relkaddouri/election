import type { UserRole } from "@/types/database";

/**
 * Libellés arabes des rôles (cf. sections 17-19 du cahier des charges).
 *
 * Seuls ces libellés changent avec l'usage : la clé `parlementaire` reste la
 * valeur stockée en base et employée par les policies RLS. Renommer l'une sans
 * l'autre est délibéré — l'affichage évolue, le schéma ne bouge pas.
 */
export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "مدير عام",
  saisie: "مستخدم الإدخال",
  parlementaire: "مسير",
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

/**
 * Clé d'icône, résolue en composant dans `NavLinks`.
 *
 * Une chaîne plutôt que le composant lui-même : ce module est importé par des
 * Server Actions et des utilitaires serveur, qui n'ont aucune raison de tirer
 * la bibliothèque d'icônes avec eux.
 */
export type NavIcon =
  | "dashboard"
  | "cadres"
  | "electeurs"
  | "users"
  | "reports"
  | "settings"
  | "journal";

export type NavItem = {
  /** Libellé affiché, en arabe. */
  label: string;
  href: string;
  icon: NavIcon;
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
 * Le tableau de bord est ouvert aux trois rôles. Les chiffres d'un « saisie »
 * sont ceux de son périmètre, le RLS s'en chargeant ; seule la carte du nombre
 * d'utilisateurs lui est retirée — et n'est alors même pas demandée à la base.
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { label: "الرئيسية", href: "/", icon: "dashboard", roles: ALL_ROLES },
  { label: "المؤطرون", href: "/cadres", icon: "cadres", roles: ALL_ROLES },
  {
    label: "الناخبون",
    href: "/electeurs",
    icon: "electeurs",
    roles: ALL_ROLES,
  },
  {
    label: "المستخدمون",
    href: "/utilisateurs",
    icon: "users",
    roles: ["super_admin"],
  },
  { label: "التقارير", href: "/rapports", icon: "reports", roles: ALL_ROLES },
  {
    label: "الإعدادات",
    href: "/parametres",
    icon: "settings",
    roles: ["super_admin"],
  },
  // Absent de la liste du cahier des charges (section 3) : le journal y est
  // demandé sans emplacement précis. Une entrée dédiée vaut mieux que de
  // l'enterrer dans les réglages.
  {
    label: "سجل العمليات",
    href: "/journal",
    // Absent de la liste fournie : ScrollText choisi par cohérence.
    icon: "journal",
    roles: ["super_admin"],
  },
];

export function navItemsForRole(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}

/**
 * Page d'atterrissage après connexion.
 *
 * Doit toujours pointer vers une route que le rôle peut réellement ouvrir,
 * sinon `requireRole` renverrait l'utilisateur en boucle. Le tableau de bord
 * étant désormais accessible aux trois rôles, il sert d'accueil à tous.
 */
export function homeRouteForRole(_role: UserRole): string {
  return "/";
}

/** Route vers laquelle renvoyer un utilisateur dont le rôle est insuffisant. */
export const ACCESS_DENIED_ROUTE = "/acces-refuse";

/** Routes accessibles sans session. */
export const PUBLIC_ROUTES: readonly string[] = ["/login"];

/** Taille de page par défaut des listes d'électeurs. */
export const DEFAULT_PAGE_SIZE = 25;

/**
 * Couleur d'accent par défaut.
 *
 * Doit rester identique à `--color-primary` dans `globals.css` : la feuille de
 * style s'en sert tant que la page n'a pas encore posé la valeur de la base,
 * et le sélecteur de couleur des réglages en part quand rien n'est configuré.
 */
export const DEFAULT_PRIMARY_COLOR = "#0d844c";

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
 * Longueur minimale d'un mot de passe.
 *
 * Défini ici et non dans `actions/users.ts` : un module `"use server"` ne peut
 * exporter que des fonctions asynchrones.
 */
export const MIN_PASSWORD_LENGTH = 8;

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
