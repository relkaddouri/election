import "server-only";

import chromium from "@sparticuz/chromium";
import puppeteerCore, { type Browser } from "puppeteer-core";

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

  const isDev = process.env.NODE_ENV === "development";

  browserPromise = puppeteerCore.launch({
    args: isDev ? ["--no-sandbox", "--disable-dev-shm-usage"] : chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: isDev
      ? process.env.CHROME_EXECUTABLE_PATH ||
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" // Modifiez ce chemin si vous êtes sur Windows/Linux en local
      : await chromium.executablePath(),
    headless: isDev ? true : chromium.headless,
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