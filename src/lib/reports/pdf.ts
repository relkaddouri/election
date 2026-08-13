import "server-only";

import puppeteer, { type Browser } from "puppeteer";

/**
 * Instance Chromium partagée.
 *
 * Un lancement coûte ~300 ms et une centaine de Mo : le refaire à chaque export
 * rendrait la génération lente et exposerait à l'épuisement mémoire si
 * plusieurs exports se suivent.
 */
let browserPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  const existing = await browserPromise?.catch(() => null);
  if (existing?.connected) return existing;

  browserPromise = puppeteer.launch({
    headless: true,
    // `--no-sandbox` est requis dans la plupart des conteneurs Linux, où le
    // bac à sable de Chromium ne peut pas s'initialiser.
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  return browserPromise;
}

/** Rend un document HTML complet en PDF A4. */
export async function htmlToPdf(html: string): Promise<Uint8Array> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    // `domcontentloaded` suffit : le HTML est autonome (police et logo sont
    // embarqués en base64), donc aucune ressource réseau n'est attendue.
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    // Garantit que la police embarquée est prête avant le rendu ; sans cela,
    // la première page peut sortir avec la police de repli.
    await page.evaluateHandle("document.fonts.ready");

    return await page.pdf({
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: "<div></div>",
      // Numérotation en pied de page : indispensable dès que le tableau
      // déborde sur plusieurs pages.
      footerTemplate: `
        <div style="width:100%;font-size:8pt;color:#64748b;padding:0 12mm;text-align:center;font-family:sans-serif">
          <span class="pageNumber"></span> / <span class="totalPages"></span>
        </div>`,
      margin: { top: "14mm", right: "12mm", bottom: "16mm", left: "12mm" },
    });
  } finally {
    await page.close();
  }
}
