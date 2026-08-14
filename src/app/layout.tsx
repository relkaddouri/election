import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";

import { getBranding } from "@/lib/data/branding";

/**
 * Cairo : police variable couvrant l'arabe et le latin.
 * `subsets: ["arabic", "latin"]` garde le latin pour les CIN, numéros de
 * téléphone et numéros de bureau de vote qui restent en chiffres occidentaux.
 */
const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "تدبير الناخبين",
    template: "%s | تدبير الناخبين",
  },
  description: "تطبيق تدبير لوائح الناخبين والمؤطرين",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // `maximumScale` volontairement non bridé : le zoom doit rester possible
  // (accessibilité, saisie terrain).
  themeColor: "#ffffff",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { primaryColor } = await getBranding();

  return (
    /*
      La couleur d'accent est posée en style inline sur <html> : sa spécificité
      l'emporte sur le `:root` de la feuille de style, et toute la gamme
      `brand-*` en découle par `color-mix()`. Rien à recompiler ni à
      redéployer quand elle change.
    */
    <html
      lang="ar"
      dir="rtl"
      className={`${cairo.variable} h-full`}
      style={{ "--color-primary": primaryColor } as React.CSSProperties}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
