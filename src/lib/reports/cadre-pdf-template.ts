import "server-only";

import { readFileSync } from "node:fs";
import path from "node:path";

import type { CadreReport, ReportSettings } from "@/lib/reports/data";

/**
 * Cairo, embarquée en base64 dans le HTML.
 *
 * Indispensable : un serveur Linux n'a en général aucune police arabe
 * installée, et Chromium replierait alors l'arabe sur des carrés vides. Lue
 * une seule fois par processus.
 */
let cachedFont: string | null = null;

function getFontBase64(): string {
  if (cachedFont) return cachedFont;
  const fontPath = path.join(process.cwd(), "src/lib/reports/fonts/Cairo.ttf");
  cachedFont = readFileSync(fontPath).toString("base64");
  return cachedFont;
}

/** Neutralise le HTML : les données viennent de la saisie utilisateur. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Document HTML imprimé par Chromium.
 *
 * Passer par HTML plutôt que par une bibliothèque PDF n'est pas un raccourci :
 * l'arabe exige le façonnage contextuel des lettres (une même lettre a jusqu'à
 * quatre formes selon sa position) et la réorganisation bidirectionnelle du
 * texte. Chromium fait les deux nativement ; `pdf-lib` et consorts écrivent les
 * glyphes en forme isolée et dans l'ordre logique, ce qui donne un texte
 * illisible.
 */
export function renderCadrePdfHtml({
  report,
  settings,
  logo,
}: {
  report: CadreReport;
  settings: ReportSettings;
  logo: { base64: string; extension: string } | null;
}): string {
  const { cadre, electeurs } = report;

  const rows = electeurs
    .map(
      (electeur) => `
        <tr>
          <td class="num">${electeur.order_number}</td>
          <td class="num">${escapeHtml(electeur.cin)}</td>
          <td>${escapeHtml(electeur.full_name)}</td>
          <td class="num">${escapeHtml(electeur.phone)}</td>
          <td class="num">${escapeHtml(electeur.polling_station_number)}</td>
          <td>${escapeHtml(electeur.polling_location)}</td>
        </tr>`,
    )
    .join("");

  const logoImg = logo
    ? `<img class="logo" src="data:image/${logo.extension};base64,${logo.base64}" alt="" />`
    : "";

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(cadre.full_name)}</title>
<style>
  @font-face {
    font-family: "Cairo";
    src: url(data:font/truetype;charset=utf-8;base64,${getFontBase64()}) format("truetype");
    font-weight: 200 1000;
  }

  @page {
    size: A4;
    margin: 14mm 12mm 16mm 12mm;
  }

  * { box-sizing: border-box; }

  body {
    font-family: "Cairo", sans-serif;
    margin: 0;
    color: #0f172a;
    font-size: 10pt;
  }

  .header {
    display: flex;
    align-items: center;
    gap: 12px;
    border-bottom: 2px solid #0d844c;
    padding-bottom: 10px;
    margin-bottom: 14px;
  }
  .logo { height: 56px; width: auto; }
  .party { font-size: 15pt; font-weight: 700; }
  .community { font-size: 11pt; color: #475569; margin-top: 2px; }

  .cadre-box {
    background: #f1f5f9;
    border-radius: 6px;
    padding: 10px 12px;
    margin-bottom: 14px;
  }
  .cadre-name { font-size: 13pt; font-weight: 700; }
  .cadre-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 24px;
    margin-top: 6px;
    font-size: 9.5pt;
  }
  .cadre-grid span { color: #475569; }
  .cadre-grid b { color: #0f172a; font-weight: 600; }

  table { width: 100%; border-collapse: collapse; }

  /* table-header-group fait répéter l'en-tête en haut de chaque page :
     sans lui, les colonnes ne seraient nommées que sur la première. */
  thead { display: table-header-group; }

  /* Empêche une ligne d'être coupée en deux par un saut de page. */
  tr { break-inside: avoid; }

  th, td {
    border: 1px solid #cbd5e1;
    padding: 5px 6px;
    text-align: right;
    vertical-align: middle;
  }
  th { background: #e2e8f0; font-weight: 700; font-size: 9.5pt; }
  tbody tr:nth-child(even) { background: #f8fafc; }

  /* Les chiffres restent lus de gauche à droite au sein du document RTL. */
  .num { direction: ltr; unicode-bidi: isolate; text-align: right; font-variant-numeric: tabular-nums; }

  .empty { padding: 24px; text-align: center; color: #64748b; }
</style>
</head>
<body>
  <div class="header">
    ${logoImg}
    <div>
      <div class="party">${escapeHtml(settings.partyName)}</div>
      <div class="community">${escapeHtml(settings.territorialCommunity)}</div>
    </div>
  </div>

  <div class="cadre-box">
    <div class="cadre-name">${escapeHtml(cadre.full_name)}</div>
    <div class="cadre-grid">
      <div><span>رقم البطاقة الوطنية :</span> <b class="num">${escapeHtml(cadre.cin)}</b></div>
      <div><span>رقم الهاتف :</span> <b class="num">${escapeHtml(cadre.phone ?? "—")}</b></div>
      <div><span>مكتب التصويت :</span> <b class="num">${escapeHtml(cadre.polling_station_number)}</b></div>
      <div><span>مكان التصويت :</span> <b>${escapeHtml(cadre.polling_location)}</b></div>
      <div><span>عدد الناخبين :</span> <b class="num">${electeurs.length}</b></div>
    </div>
  </div>

  ${
    electeurs.length === 0
      ? `<div class="empty">لا يوجد أي ناخب مسجل لدى هذا المؤطر</div>`
      : `<table>
    <thead>
      <tr>
        <th style="width:11%">رقم الترتيب</th>
        <th style="width:16%">رقم البطاقة الوطنية</th>
        <th style="width:26%">الاسم الكامل</th>
        <th style="width:15%">رقم الهاتف</th>
        <th style="width:12%">مكتب التصويت</th>
        <th>مكان التصويت</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`
  }
</body>
</html>`;
}
