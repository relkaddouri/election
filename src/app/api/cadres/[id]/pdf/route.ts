import { NextResponse, type NextRequest } from "next/server";

import { logAudit } from "@/lib/audit";
import { getSessionUser } from "@/lib/auth";
import { renderCadrePdfHtml } from "@/lib/reports/cadre-pdf-template";
import {
  fetchLogo,
  getCadreReport,
  getReportSettings,
} from "@/lib/reports/data";
import { htmlToPdf } from "@/lib/reports/pdf";

/** Puppeteer a besoin de Node : il ne fonctionne pas sur le runtime Edge. */
export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // Un Route Handler n'est pas couvert par `requireRole` : le contrôle doit
  // être refait ici, sinon l'URL serait ouverte à tout visiteur.
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const { id } = await params;

  // `getCadreReport` passe par le RLS : un cadre hors périmètre renvoie null,
  // et l'on répond 404 sans révéler son existence.
  const report = await getCadreReport(id);
  if (!report) {
    return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  }

  const settings = await getReportSettings();
  const logo = await fetchLogo(settings.logoUrl);

  const pdf = await htmlToPdf(renderCadrePdfHtml({ report, settings, logo }));

  await logAudit("export", "cadre", id);

  // Nom de fichier : `filename*` porte l'arabe en UTF-8 ; `filename` reste un
  // repli ASCII pour les clients qui ignorent RFC 5987.
  const arabicName = encodeURIComponent(`${report.cadre.full_name}.pdf`);

  // `?apercu=1` affiche le PDF dans le navigateur au lieu de le télécharger :
  // pratique pour vérifier la mise en page avant d'imprimer.
  const inline = request.nextUrl.searchParams.get("apercu") === "1";
  const disposition = inline ? "inline" : "attachment";

  return new NextResponse(pdf as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="cadre-${id}.pdf"; filename*=UTF-8''${arabicName}`,
      "Cache-Control": "no-store",
    },
  });
}
