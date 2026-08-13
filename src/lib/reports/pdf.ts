import "server-only";

import chromium from "@sparticuz/chromium";
import puppeteerCore, { type Browser } from "puppeteer-core";

let browserPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  const existing = await browserPromise?.catch(() => null);
  if (existing?.connected) return existing;

  const isDev = process.env.NODE_ENV === "development";

  // URL de secours pour Vercel si le binaire local n'est pas extrait par le bundler
  const remoteExecutablePath =
    "https://github.com/Sparticuz/chromium/releases/download/v131.0.0/chromium-v131.0.0-pack.tar";

  const executablePath = isDev
    ? process.env.CHROME_EXECUTABLE_PATH ||
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    : await chromium.executablePath(remoteExecutablePath);

  browserPromise = puppeteerCore.launch({
    args: isDev ? ["--no-sandbox", "--disable-dev-shm-usage"] : chromium.args,
    executablePath: executablePath,
    headless: isDev ? true : true,
  });

  return browserPromise;
}

/** Rend un document HTML complet en PDF A4. */
export async function htmlToPdf(html: string): Promise<Uint8Array> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    await page.evaluateHandle("document.fonts.ready");

    return await page.pdf({
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: "<div></div>",
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