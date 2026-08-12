import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";

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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} h-full`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
