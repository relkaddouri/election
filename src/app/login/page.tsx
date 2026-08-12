import type { Metadata } from "next";

import { LoginForm } from "@/app/login/login-form";

export const metadata: Metadata = {
  title: "تسجيل الدخول",
};

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <header className="mb-6 text-center">
          <h1 className="text-2xl font-bold">تدبير الناخبين</h1>
          <p className="mt-1 text-sm text-slate-600">
            سجّل الدخول للمتابعة إلى النظام
          </p>
        </header>

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
