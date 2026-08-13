import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Ces paquets sont chargés par Node à l'exécution plutôt qu'inclus dans le
   * bundle : Puppeteer résout le binaire Chromium par chemin de fichier, et
   * ExcelJS embarque des dépendances natives — les empaqueter casse les deux.
   */
  serverExternalPackages: ["puppeteer", "exceljs"],
};

export default nextConfig;
