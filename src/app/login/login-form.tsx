"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signIn, type SignInState } from "@/lib/actions/auth";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<SignInState, FormData>(
    signIn,
    null,
  );

  // Champ contrôlé : React réinitialise les champs non contrôlés d'un
  // formulaire après l'exécution d'une action. Sans cela, une erreur de mot de
  // passe obligerait à ressaisir aussi l'adresse e-mail.
  const [identifier, setIdentifier] = useState("");

  const errorId = state?.error ? "login-error" : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="identifier" className="font-medium">
          اسم المستخدم
        </label>
        {/* `dir="ltr"` : l'identifiant est du texte latin, il doit se saisir et
            s'aligner de gauche à droite même sur une page RTL. */}
        <Input
          id="identifier"
          name="identifier"
          dir="ltr"
          autoComplete="username"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          /* Pas d'attribut `required` : le navigateur afficherait sa bulle de
             validation dans SA langue, en anglais au milieu d'une interface
             arabe. La vérification est faite côté serveur, qui répond en
             arabe. */
          aria-required="true"
          aria-invalid={state?.error ? true : undefined}
          aria-describedby={errorId}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="font-medium">
          كلمة المرور
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          dir="ltr"
          autoComplete="current-password"
          aria-required="true"
          aria-invalid={state?.error ? true : undefined}
          aria-describedby={errorId}
        />
      </div>

      {state?.error && (
        <p
          id="login-error"
          role="alert"
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {state.error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? "جارٍ تسجيل الدخول…" : "تسجيل الدخول"}
      </Button>
    </form>
  );
}
