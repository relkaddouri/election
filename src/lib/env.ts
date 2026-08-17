/**
 * Accès centralisé et validé aux variables d'environnement.
 *
 * Les variables `NEXT_PUBLIC_*` sont lues littéralement (et non via un accès
 * dynamique à `process.env`) : Next.js les remplace à la compilation, ce qui
 * n'a lieu que si elles apparaissent textuellement dans le code.
 *
 * Le projet utilise le format d'API keys actuel de Supabase
 * (`sb_publishable_…` / `sb_secret_…`) et non les anciennes clés JWT
 * `anon` / `service_role`.
 */

function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(
      `Variable d'environnement manquante : ${name}. Copiez .env.example vers .env.local et renseignez-la.`,
    );
  }
  return value;
}

/**
 * Vrai si les clés publiques Supabase sont présentes. Permet de démarrer
 * l'application avant que le projet Supabase ne soit configuré, sans faire
 * échouer chaque requête.
 */
export const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);

/** Clés publiques — utilisables côté navigateur comme côté serveur. */
export const publicEnv = {
  get supabaseUrl(): string {
    return required(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      "NEXT_PUBLIC_SUPABASE_URL",
    );
  },
  /** Clé « publishable » : exposée au navigateur, protégée par le RLS. */
  get supabasePublishableKey(): string {
    return required(
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );
  },
};

/**
 * Clé secrète : contourne le RLS. Ne doit JAMAIS être importée depuis un
 * composant client ni exposée au navigateur.
 */
export function getSecretKey(): string {
  return required(process.env.SUPABASE_SECRET_KEY, "SUPABASE_SECRET_KEY");
}

/** Clé d'API Resend, pour l'envoi du rapport Excel par e-mail. */
export function getResendApiKey(): string {
  return required(process.env.RESEND_API_KEY, "RESEND_API_KEY");
}

/**
 * Vrai si l'envoi d'e-mails est configuré.
 *
 * Permet à la page « التقارير » de masquer le bouton d'envoi plutôt que de le
 * proposer pour qu'il échoue au clic.
 */
export const isEmailConfigured = Boolean(process.env.RESEND_API_KEY);

/**
 * Secret partagé avec le planificateur Vercel.
 *
 * Renvoie `null` s'il n'est pas défini : la route cron refuse alors toutes les
 * requêtes. Une absence de secret ne doit jamais valoir autorisation — sans
 * cela, oublier la variable exposerait publiquement l'export complet.
 */
export function getCronSecret(): string | null {
  return process.env.CRON_SECRET || null;
}
