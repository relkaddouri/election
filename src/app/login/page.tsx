import type { Metadata } from "next";
import Image from "next/image";

import { LoginForm } from "@/app/login/login-form";
import { INACTIVITY_REASON, LOGOUT_REASON_PARAM } from "@/lib/constants";
import { getBranding } from "@/lib/data/branding";

export const metadata: Metadata = {
  title: "تسجيل الدخول",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  // Lisible sans session : une policy autorise le rôle `anon` à lire les
  // seules colonnes d'habillage de `settings`.
  const { partyName, logoUrl } = await getBranding();

  // Explique la déconnexion au lieu de laisser croire à une session perdue.
  const parDéconnexionAutomatique =
    (await searchParams)[LOGOUT_REASON_PARAM] === INACTIVITY_REASON;

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <header className="mb-6 text-center">
          {/*
            Aucun emplacement réservé quand le logo n'est pas configuré : ni
            cadre vide, ni image cassée — l'en-tête se referme simplement sur
            le nom du parti.
          */}
          {logoUrl && (
            <Image
              src={logoUrl}
              alt={partyName ?? ""}
              width={96}
              height={96}
              // L'image vient de Supabase Storage, un domaine externe.
              // L'optimiseur Next exigerait de le déclarer en configuration,
              // pour un unique logo affiché une fois.
              unoptimized
              priority
              className="mx-auto mb-4 h-24 w-auto object-contain"
            />
          )}

          <h1 className="text-2xl font-bold">
            {partyName ?? "تدبير الناخبين"}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            سجّل الدخول للمتابعة إلى النظام
          </p>
        </header>

        {parDéconnexionAutomatique && (
          <p
            role="status"
            className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-center text-sm text-amber-900"
          >
            تم تسجيل الخروج بسبب عدم النشاط
          </p>
        )}

        <div className="rounded-xl border border-line bg-surface p-5 sm:p-6">
          <LoginForm />
        </div>

        <p className="mt-4 text-center text-sm text-slate-500">
          الحسابات يُنشئها المدير العام فقط
        </p>
      </div>
    </main>
  );
}
