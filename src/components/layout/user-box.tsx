import { signOut } from "@/lib/actions/auth";
import { ROLE_BADGES, ROLE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/types";

/** Identité de l'utilisateur connecté + déconnexion. */
export function UserBox({
  user,
  className,
}: {
  user: SessionUser;
  className?: string;
}) {
  return (
    <div className={cn("border-t border-line pt-3", className)}>
      <div className="px-3 pb-2">
        <p className="truncate font-medium">{user.fullName}</p>
        <p className="mt-0.5 text-sm text-slate-500">
          <span aria-hidden="true">{ROLE_BADGES[user.role]}</span>{" "}
          {ROLE_LABELS[user.role]}
        </p>
      </div>
      {/* Server Action : la déconnexion fonctionne même sans JavaScript. */}
      <form action={signOut}>
        <button
          type="submit"
          className="flex min-h-touch w-full items-center rounded-lg px-3 text-start font-medium text-red-700 transition-colors hover:bg-red-50"
        >
          تسجيل الخروج
        </button>
      </form>
    </div>
  );
}
