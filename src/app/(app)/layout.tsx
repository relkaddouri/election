import { AppShell } from "@/components/layout/app-shell";
import { InactivityGuard } from "@/components/layout/inactivity-guard";
import { requireUser } from "@/lib/auth";

/**
 * Layout des pages authentifiées.
 *
 * `requireUser()` garantit qu'aucun rendu n'a lieu sans session, y compris si
 * le proxy était contourné. Le contrôle **par rôle** appartient à chaque page :
 * il dépend de la route, que le layout ne connaît pas.
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();

  return (
    <AppShell user={user}>
      {/* Monté ici et non dans le layout racine : la page de connexion n'a
          pas de session à faire expirer. */}
      <InactivityGuard />
      {children}
    </AppShell>
  );
}
