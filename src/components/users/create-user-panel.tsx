"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { UserForm } from "@/components/users/user-form";
import { createUser } from "@/lib/actions/users";
import type { CadreWithCount } from "@/types";

/** Ouvre le même formulaire que l'édition, en mode création. */
export function CreateUserPanel({ cadres }: { cadres: CadreWithCount[] }) {
  const [open, setOpen] = useState(false);
  const [created, setCreated] = useState<string | null>(null);

  if (!open) {
    return (
      <div className="mb-6 flex flex-col gap-2">
        <Button onClick={() => setOpen(true)} className="w-full sm:w-auto">
          إضافة مستخدم
        </Button>
        {created && (
          <p
            role="status"
            className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800"
          >
            {created}
          </p>
        )}
      </div>
    );
  }

  return (
    <section className="mb-6 rounded-xl border border-line bg-surface p-4 sm:p-6">
      <h2 className="mb-4 font-semibold">إضافة مستخدم جديد</h2>
      <UserForm
        action={createUser}
        cadres={cadres}
        onDone={() => {
          setCreated("تم إنشاء المستخدم");
          setOpen(false);
        }}
      />
      <div className="mt-4">
        <Button variant="secondary" onClick={() => setOpen(false)}>
          إلغاء
        </Button>
      </div>
    </section>
  );
}
