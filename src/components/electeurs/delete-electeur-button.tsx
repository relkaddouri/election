"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  deleteElecteur,
  type DeleteElecteurState,
} from "@/lib/actions/electeurs";

export function DeleteElecteurButton({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false);
  const [state, formAction, pending] = useActionState<DeleteElecteurState>(
    deleteElecteur.bind(null, id),
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
          حذف الناخب
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
      <p className="font-medium text-red-900">هل تريد فعلاً حذف هذا الناخب؟</p>
      <p className="mt-1 text-sm text-red-800">
        سيُعاد ترقيم باقي ناخبي المؤطر تلقائياً.
      </p>

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
