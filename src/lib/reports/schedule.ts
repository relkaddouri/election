import { REPORT_TIMEZONE } from "@/lib/constants";
import type { ReportSchedule } from "@/lib/data/settings";

/**
 * Découpage d'un instant dans le fuseau du Maroc.
 *
 * Tout le calcul d'échéance passe par ici. Utiliser les méthodes `getDate()` /
 * `getDay()` d'un `Date` renverrait le fuseau du serveur — UTC sur Vercel — et
 * un envoi mensuel réglé au 1er partirait le dernier jour du mois précédent.
 */
export function zonedParts(
  date: Date,
  timeZone: string = REPORT_TIMEZONE,
): { isoDate: string; day: number; weekday: number; daysInMonth: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(date);

  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  const year = Number(value("year"));
  const month = Number(value("month"));
  const day = Number(value("day"));

  const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return {
    isoDate: `${value("year")}-${value("month")}-${value("day")}`,
    day,
    weekday: WEEKDAYS.indexOf(value("weekday")),
    // `Date.UTC(année, mois, 0)` = dernier jour du mois précédent ; `month`
    // étant déjà 1-based, cela donne bien le dernier jour du mois courant.
    daysInMonth: new Date(Date.UTC(year, month, 0)).getUTCDate(),
  };
}

export type DueDecision = { due: boolean; reason: string };

/**
 * L'envoi automatique est-il dû maintenant ?
 *
 * Deux garde-fous communs à toutes les fréquences : l'envoi doit être activé,
 * et un rapport déjà parti aujourd'hui n'est pas renvoyé. Ce second point
 * couvre aussi les relances du planificateur — Vercel peut rejouer une tâche
 * après un échec réseau, et rien ne serait plus déroutant que deux rapports
 * identiques dans la boîte de réception.
 */
export function isReportDue(
  schedule: ReportSchedule,
  now: Date = new Date(),
  timeZone: string = REPORT_TIMEZONE,
): DueDecision {
  if (!schedule.enabled) {
    return { due: false, reason: "envoi automatique désactivé" };
  }
  if (!schedule.email) {
    return { due: false, reason: "aucun destinataire configuré" };
  }

  const today = zonedParts(now, timeZone);

  if (schedule.lastSentAt) {
    const last = zonedParts(new Date(schedule.lastSentAt), timeZone);
    if (last.isoDate === today.isoDate) {
      return { due: false, reason: `déjà envoyé le ${today.isoDate}` };
    }
  }

  switch (schedule.frequency) {
    case "daily":
      return { due: true, reason: "quotidien" };

    case "weekly":
      return schedule.weekday === today.weekday
        ? { due: true, reason: "hebdomadaire, jour correspondant" }
        : {
            due: false,
            reason: `hebdomadaire : jour ${today.weekday}, attendu ${schedule.weekday}`,
          };

    case "monthly": {
      const wanted = schedule.dayOfMonth ?? 1;
      // Un quantième absent du mois — 31 en février — ne doit pas faire sauter
      // l'envoi : il bascule sur le dernier jour du mois.
      const target = Math.min(wanted, today.daysInMonth);
      return target === today.day
        ? { due: true, reason: "mensuel, quantième correspondant" }
        : {
            due: false,
            reason: `mensuel : jour ${today.day}, attendu ${target}`,
          };
    }
  }
}
