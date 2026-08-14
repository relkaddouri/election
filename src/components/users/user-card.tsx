"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { UserForm } from "@/components/users/user-form";
import { updateUser } from "@/lib/actions/users";
import { ROLE_BADGES, ROLE_LABELS } from "@/lib/constants";
import type { ManagedUser } from "@/lib/data/users";

/** Ligne de liste : nom, identifiant, rôle — puis le même formulaire en édition. */
export function UserCard({
  user,
  isSelf,
}: {
  user: ManagedUser;
  isSelf: boolean;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <li className="rounded-xl border border-line bg-surface p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{user.full_name}</span>
            {!user.is_active && (
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-sm text-red-700">
                معطّل
              </span>
            )}
            {isSelf && (
              <span className="rounded-full bg-surface-muted px-2 py-0.5 text-sm text-slate-600">
                أنت
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate ltr-field text-sm text-slate-500">
            {user.username}
          </p>
          <p className="mt-1 text-sm">
            <span aria-hidden="true">{ROLE_BADGES[user.role]}</span>{" "}
            {ROLE_LABELS[user.role]}
          </p>
        </div>

        <Button
          variant="secondary"
          onClick={() => setEditing((value) => !value)}
          className="w-full shrink-0 sm:w-auto"
        >
          {editing ? "إغلاق" : "تعديل"}
        </Button>
      </div>

      {editing && (
        <div className="mt-4 border-t border-line pt-4">
          <UserForm
            action={updateUser.bind(null, user.id)}
            user={user}
            isSelf={isSelf}
          />
        </div>
      )}
    </li>
  );
}
