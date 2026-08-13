import "server-only";

import ExcelJS from "exceljs";

import type { CadreReport, ReportSettings } from "@/lib/reports/data";

/**
 * Excel limite les noms d'onglet à 31 caractères et interdit `: \ / ? * [ ]`.
 * Deux cadres peuvent aussi porter le même nom : un suffixe numérique évite
 * qu'ExcelJS lève une erreur de doublon en plein export.
 */
function sheetName(fullName: string, used: Set<string>): string {
  const base = (fullName.replace(/[:\\/?*[\]]/g, " ").trim() || "مؤطر").slice(
    0,
    28,
  );

  let candidate = base;
  let index = 2;
  while (used.has(candidate)) {
    candidate = `${base} ${index++}`;
  }
  used.add(candidate);
  return candidate;
}

const COLUMNS = [
  { header: "رقم الترتيب", width: 12 },
  { header: "رقم البطاقة الوطنية", width: 20 },
  { header: "الاسم الكامل", width: 28 },
  { header: "رقم الهاتف", width: 16 },
  { header: "رقم مكتب التصويت", width: 18 },
  { header: "مكان التصويت", width: 30 },
];

/** Classeur complet : une feuille par cadre. */
export async function buildExcelWorkbook({
  reports,
  settings,
  logo,
}: {
  reports: CadreReport[];
  settings: ReportSettings;
  logo: { base64: string; extension: "png" | "jpeg" } | null;
}): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();

  const logoId = logo
    ? workbook.addImage({ base64: logo.base64, extension: logo.extension })
    : null;

  const usedNames = new Set<string>();

  for (const { cadre, electeurs } of reports) {
    const sheet = workbook.addWorksheet(sheetName(cadre.full_name, usedNames), {
      // Sans cela, Excel afficherait la feuille de gauche à droite : la
      // colonne « رقم الترتيب » se retrouverait à l'opposé de la lecture.
      views: [{ rightToLeft: true, state: "frozen", ySplit: 7 }],
    });

    sheet.columns = COLUMNS.map((column) => ({ width: column.width }));

    // --- En-tête -------------------------------------------------------------
    sheet.mergeCells("A1:F1");
    const party = sheet.getCell("A1");
    party.value = settings.partyName;
    party.font = { size: 16, bold: true };
    party.alignment = { horizontal: "center", vertical: "middle" };
    sheet.getRow(1).height = 28;

    sheet.mergeCells("A2:F2");
    const community = sheet.getCell("A2");
    community.value = settings.territorialCommunity;
    community.font = { size: 12, color: { argb: "FF475569" } };
    community.alignment = { horizontal: "center" };

    if (logoId !== null) {
      // Ancrage flottant : l'image ne perturbe pas la hauteur des lignes.
      sheet.addImage(logoId, {
        tl: { col: 0.2, row: 0.2 },
        ext: { width: 70, height: 70 },
      });
      sheet.getRow(1).height = 40;
      sheet.getRow(2).height = 24;
    }

    sheet.mergeCells("A4:F4");
    const name = sheet.getCell("A4");
    name.value = cadre.full_name;
    name.font = { size: 13, bold: true };
    name.alignment = { horizontal: "center" };

    sheet.mergeCells("A5:F5");
    const meta = sheet.getCell("A5");
    meta.value = `رقم البطاقة الوطنية : ${cadre.cin}   |   مكتب التصويت : ${cadre.polling_station_number}   |   عدد الناخبين : ${electeurs.length}`;
    meta.font = { size: 11 };
    meta.alignment = { horizontal: "center" };

    // --- Tableau -------------------------------------------------------------
    const headerRow = sheet.getRow(7);
    headerRow.values = COLUMNS.map((column) => column.header);
    headerRow.height = 22;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF0D844C" },
      };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      };
    });

    electeurs.forEach((electeur, index) => {
      const row = sheet.getRow(8 + index);
      row.values = [
        electeur.order_number,
        electeur.cin,
        electeur.full_name,
        electeur.phone,
        electeur.polling_station_number,
        electeur.polling_location,
      ];
      row.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: "hair" },
          bottom: { style: "hair" },
          left: { style: "hair" },
          right: { style: "hair" },
        };
        // Les colonnes de texte arabe se lisent à droite ; les identifiants et
        // numéros restent centrés pour rester alignés entre eux.
        cell.alignment = {
          horizontal: colNumber === 3 || colNumber === 6 ? "right" : "center",
          vertical: "middle",
        };
      });
    });

    // Filtres sur l'en-tête : l'utilisateur peut trier sans reconstruire
    // l'export.
    if (electeurs.length > 0) {
      sheet.autoFilter = {
        from: { row: 7, column: 1 },
        to: { row: 7 + electeurs.length, column: COLUMNS.length },
      };
    }
  }

  if (reports.length === 0) {
    const sheet = workbook.addWorksheet("لا توجد بيانات", {
      views: [{ rightToLeft: true }],
    });
    sheet.getCell("A1").value = "لا يوجد أي مؤطر";
  }

  // ExcelJS déclare son propre type `Buffer` (une interface étendant
  // ArrayBuffer) alors qu'il renvoie un Buffer Node. `new Uint8Array(...)`
  // traite correctement les deux formes, et c'est ce qu'attend `NextResponse`.
  const written = await workbook.xlsx.writeBuffer();
  return new Uint8Array(written as ArrayBuffer);
}
