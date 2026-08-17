import "server-only";

import { Resend } from "resend";

import {
  DEFAULT_REPORT_FROM,
  REPORT_EMAIL_SUBJECT,
  REPORT_TIMEZONE,
} from "@/lib/constants";
import { getResendApiKey, isEmailConfigured } from "@/lib/env";
import {
  fetchLogo,
  getAllCadreReports,
  getReportSettings,
  type ReportClient,
} from "@/lib/reports/data";
import { buildExcelWorkbook } from "@/lib/reports/excel";

/**
 * Résultat d'un envoi.
 *
 * Deux messages plutôt qu'un : `error` s'affiche à l'utilisateur en arabe,
 * `detail` part dans les journaux du serveur. Montrer le message brut de Resend
 * dans l'interface n'aiderait personne ; le perdre rendrait un échec
 * d'acheminement impossible à diagnostiquer.
 */
export type SendOutcome =
  | { ok: true; recipient: string }
  | { ok: false; error: string; detail?: string };

/**
 * Nom de la pièce jointe, volontairement en caractères latins.
 *
 * Le fichier téléchargé depuis l'interface porte un nom arabe (encodé selon la
 * RFC 5987), mais les clients de messagerie encodent les noms de pièces
 * jointes non ASCII de façon inégale : un nom illisible dans certaines boîtes
 * de réception vaut moins qu'un nom latin lisible partout.
 */
export function reportFileName(date = new Date()): string {
  return `electeurs-${date.toISOString().slice(0, 10)}.xlsx`;
}

/** Date du jour, en toutes lettres arabes, dans le fuseau du Maroc. */
function formatArabicDate(date: Date): string {
  return new Intl.DateTimeFormat("ar-MA", {
    timeZone: REPORT_TIMEZONE,
    dateStyle: "full",
  }).format(date);
}

/** Corps du message. Aligné à droite : le contenu est intégralement arabe. */
function emailHtml({
  partyName,
  cadreCount,
  electeurCount,
  sentAt,
}: {
  partyName: string;
  cadreCount: number;
  electeurCount: number;
  sentAt: Date;
}): string {
  return `<div dir="rtl" lang="ar" style="font-family:'Segoe UI',Tahoma,sans-serif;text-align:right;color:#0f172a">
  <h1 style="font-size:18px;margin:0 0 4px">${REPORT_EMAIL_SUBJECT}</h1>
  <p style="margin:0 0 16px;color:#475569">${partyName}</p>
  <p style="margin:0 0 8px">${formatArabicDate(sentAt)}</p>
  <p style="margin:0 0 8px">تجدون رفقته لائحة الناخبين الكاملة بصيغة Excel، بورقة لكل مؤطر.</p>
  <ul style="margin:0;padding-inline-start:20px;padding-inline-end:0">
    <li>عدد المؤطرين : ${cadreCount}</li>
    <li>عدد الناخبين : ${electeurCount}</li>
  </ul>
</div>`;
}

/**
 * Construit le classeur Excel complet — une feuille par cadre.
 *
 * Sans `client`, les données passent par la session en cours et donc par le
 * RLS. La tâche planifiée doit lui passer le client administrateur.
 */
async function buildWorkbook(client?: ReportClient) {
  const [reports, settings] = await Promise.all([
    getAllCadreReports(client),
    getReportSettings(client),
  ]);
  const logo = await fetchLogo(settings.logoUrl);

  return {
    workbook: await buildExcelWorkbook({ reports, settings, logo }),
    settings,
    cadreCount: reports.length,
    electeurCount: reports.reduce((total, r) => total + r.electeurs.length, 0),
  };
}

/**
 * Traduit en arabe le refus renvoyé par Resend.
 *
 * Un seul cas est distingué, parce que c'est le seul que l'utilisateur puisse
 * corriger lui-même et de loin le plus fréquent à la mise en service : tant
 * qu'aucun domaine n'est vérifié, Resend n'accepte d'écrire qu'au titulaire du
 * compte. Un message générique laisserait chercher du côté de l'adresse saisie,
 * qui n'est pourtant pas en cause.
 */
function translateSendError(message: string): string {
  if (/only send testing emails/i.test(message)) {
    const owner = message.match(/\(([^)]+@[^)]+)\)/)?.[1];
    return owner
      ? `خدمة البريد ما زالت في وضع التجريب : لا يمكن الإرسال إلا إلى ${owner}. غيّر عنوان المُستقبِل في الإعدادات، أو فعّل نطاقاً خاصاً لدى Resend`
      : "خدمة البريد ما زالت في وضع التجريب : لا يمكن الإرسال إلا إلى عنوان صاحب حساب Resend";
  }

  return "تعذّر إرسال البريد الإلكتروني. تحقق من العنوان وحاول مرة أخرى";
}

/**
 * Génère le rapport Excel complet et l'envoie en pièce jointe.
 *
 * Ne lève pas : les deux appelants — la Server Action du bouton manuel et la
 * route cron — ont besoin de rendre compte de l'échec, pas de le propager.
 */
export async function sendFullReport({
  to,
  client,
}: {
  to: string;
  client?: ReportClient;
}): Promise<SendOutcome> {
  if (!isEmailConfigured) {
    return {
      ok: false,
      error: "إرسال البريد الإلكتروني غير مُعدّ على الخادم",
      detail: "RESEND_API_KEY absente",
    };
  }

  const recipient = to.trim();
  if (!recipient) {
    return { ok: false, error: "لم يُحدَّد أي عنوان بريد إلكتروني للمُستقبِل" };
  }

  try {
    const { workbook, settings, cadreCount, electeurCount } =
      await buildWorkbook(client);

    const sentAt = new Date();
    const resend = new Resend(getResendApiKey());

    const { error } = await resend.emails.send({
      from: process.env.REPORT_FROM_EMAIL || DEFAULT_REPORT_FROM,
      to: recipient,
      subject: `${REPORT_EMAIL_SUBJECT} — ${sentAt.toISOString().slice(0, 10)}`,
      html: emailHtml({
        partyName: settings.partyName,
        cadreCount,
        electeurCount,
        sentAt,
      }),
      attachments: [
        {
          filename: reportFileName(sentAt),
          // Base64 et non le Buffer brut : le SDK sérialise sa charge utile en
          // JSON, où un Buffer devient un tableau d'entiers — mesuré à 3,6 fois
          // le poids du fichier, contre 1,34 en base64. Sur une base fournie,
          // c'est la différence entre passer et buter sur la limite de taille
          // de requête de Resend.
          content: Buffer.from(workbook).toString("base64"),
        },
      ],
    });

    if (error) {
      return {
        ok: false,
        error: translateSendError(error.message),
        detail: `${error.name} : ${error.message}`,
      };
    }

    return { ok: true, recipient };
  } catch (cause) {
    return {
      ok: false,
      error: "تعذّر إنشاء التقرير أو إرساله. حاول مرة أخرى",
      detail: cause instanceof Error ? cause.message : String(cause),
    };
  }
}
