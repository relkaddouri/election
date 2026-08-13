import { NextResponse } from "next/server";

import { logAudit } from "@/lib/audit";
import { getSessionUser } from "@/lib/auth";
import {
  fetchLogo,
  getAllCadreReports,
  getReportSettings,
} from "@/lib/reports/data";
import { buildExcelWorkbook } from "@/lib/reports/excel";

export const runtime = "nodejs";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  // Export complet réservé au super_admin (section 23 du cahier des charges).
  // Le RLS limiterait déjà les données d'un « saisie » à son périmètre, mais
  // l'export global n'a pas à lui être proposé du tout.
  if (user.role !== "super_admin") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const [reports, settings] = await Promise.all([
    getAllCadreReports(),
    getReportSettings(),
  ]);
  const logo = await fetchLogo(settings.logoUrl);

  const workbook = await buildExcelWorkbook({ reports, settings, logo });

  await logAudit("export", "cadre", null);

  const date = new Date().toISOString().slice(0, 10);
  const arabicName = encodeURIComponent(`لوائح الناخبين-${date}.xlsx`);

  return new NextResponse(workbook as BodyInit, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="electeurs-${date}.xlsx"; filename*=UTF-8''${arabicName}`,
      "Cache-Control": "no-store",
    },
  });
}
