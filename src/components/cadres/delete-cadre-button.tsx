"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { deleteCadre, type DeleteCadreState } from "@/lib/actions/cadres";

/**
 * Suppression d'un cadre, avec confirmation explicite.
 *
 * La contrainte `on delete restrict` fait échouer la suppression d'un cadre
 * portant des électeurs ; le message renvoyé explique quoi faire plutôt que
 * d'afficher une erreur brute.
 */
export function DeleteCadreButton({
  id,
  electeursCount,
}: {
  id: string;
  electeursCount: number;
}) {
  const [confirming, setConfirming] = useState(false);
  const [state, formAction, pending] = useActionState<DeleteCadreState>(
    deleteCadre.bind(null, id),
    null,
  );

  if (!confirming) {
    return (
      <div className="flex flex-col gap-2">
        <Button
          variant="danger"
          onClick={() => setConfirming(true)}
          className="w-full sm:w-auto"
        >
          حذف المؤطر
        </Button>
        {state?.error && (
          <p role="alert" className="text-sm text-red-700">
            {state.error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4">
      <p className="font-medium text-red-900">هل تريد فعلاً حذف هذا المؤطر؟</p>
      {electeursCount > 0 && (
        <p className="mt-1 text-sm text-red-800">
          هذا المؤطر مرتبط بـ{" "}
          <span className="ltr-field">{electeursCount}</span> ناخباً. الحذف
          سيفشل ما لم تنقلهم إلى مؤطر آخر أولاً.
        </p>
      )}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <form action={formAction}>
          <Button
            type="submit"
            variant="danger"
            disabled={pending}
            className="w-full sm:w-auto"
          >
            {pending ? "جارٍ الحذف…" : "نعم، احذف"}
          </Button>
        </form>
        <Button
          variant="secondary"
          onClick={() => setConfirming(false)}
          className="w-full sm:w-auto"
        >
          تراجع
        </Button>
      </div>

      {state?.error && (
        <p role="alert" className="mt-3 text-sm font-medium text-red-800">
          {state.error}
        </p>
      )}
    </div>
  );
}
