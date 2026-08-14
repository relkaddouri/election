/**
 * Nom d'utilisateur ↔ e-mail technique.
 *
 * Supabase Auth exige une adresse e-mail : elle est fabriquée à partir du nom
 * d'utilisateur et n'est jamais montrée. Le nom d'utilisateur **est** la partie
 * locale de cette adresse — pas une colonne séparée. Une seconde source de
 * vérité imposerait d'en garantir l'unicité à la main et de la resynchroniser à
 * chaque renommage ; ici, l'unicité des e-mails d'`auth.users` s'en charge.
 */
export const INTERNAL_EMAIL_DOMAIN = "interne.local";

/** Longueur minimale : évite les identifiants d'une lettre, ambigus à dicter. */
export const MIN_USERNAME_LENGTH = 3;

/**
 * Caractères autorisés : minuscules, chiffres, point, tiret, tiret bas.
 *
 * Restreint volontairement à ce qui reste valide en partie locale d'e-mail et
 * sans ambiguïté à l'oral — un identifiant se transmet souvent de vive voix sur
 * le terrain.
 */
const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidUsername(value: string): boolean {
  return (
    value.length >= MIN_USERNAME_LENGTH &&
    value.length <= 64 &&
    USERNAME_PATTERN.test(value)
  );
}

/** `ahmed` → `ahmed@interne.local`. */
export function usernameToEmail(username: string): string {
  return `${normalizeUsername(username)}@${INTERNAL_EMAIL_DOMAIN}`;
}

/**
 * `ahmed@interne.local` → `ahmed`.
 *
 * Fonctionne aussi pour les comptes créés avant ce mécanisme, dont l'adresse
 * porte un autre domaine : seule la partie locale compte.
 */
export function emailToUsername(email: string | null): string {
  if (!email) return "";
  const at = email.indexOf("@");
  return at === -1 ? email : email.slice(0, at);
}

/**
 * Identifiant de connexion saisi → e-mail à présenter à Supabase Auth.
 *
 * Une saisie contenant « @ » est traitée comme une adresse complète : les
 * comptes antérieurs (`admin@test.local`…) continuent ainsi de fonctionner sans
 * migration, tout en acceptant les nouveaux identifiants sans domaine.
 */
export function loginIdentifierToEmail(identifier: string): string {
  const value = identifier.trim().toLowerCase();
  return value.includes("@") ? value : usernameToEmail(value);
}
