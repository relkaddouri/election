"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { sendReportNow, type SendReportState } from "@/lib/actions/reports";

/**
 * Envoi manuel du rapport Excel par e-mail.
 *
 * Un formulaire plutôt qu'un `onClick` : `useActionState` fournit l'état
 * « en cours » sans état local, et la génération du classeur peut prendre
 * plusieurs secondes sur une base fournie — sans ce retour visuel,
 * l'utilisateur cliquerait une seconde fois et enverrait deux e-mails.
 */
export function SendReportButton({ recipient }: { recipient: string | null }) {
  const [state, formAction, pending] = useActionState<SendReportState>(
    sendReportNow,
    null,
  );

  return (
    <div className="flex flex-col gap-2">
      <form action={formAction}>
        <Button
          type="submit"
          variant="secondary"
          disabled={pending || !recipient}
          className="w-full sm:w-auto"
        >
          {pending ? "جارٍ الإرسال…" : "إرسال بالبريد الإلكتروني"}
        </Button>
      </form>

      {/* `aria-live` : le résultat arrive après un aller-retour serveur, donc
          hors du flux de lecture d'un lecteur d'écran. */}
      <div aria-live="polite">
        {!recipient && (
          <p className="text-sm text-slate-500">
            حدِّد عنوان المُستقبِل في الإعدادات لتفعيل الإرسال.
          </p>
        )}
        {state?.error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        )}
        {state?.success && (
          <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">
            {state.success}
          </p>
        )}
      </div>
    </div>
  );
}
