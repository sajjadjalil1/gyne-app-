import { prisma } from "@gyne/db";
import { startOfDay, endOfDay, subDays, addDays } from "date-fns";
import { deriveAlerts, type DerivedAlert } from "./alerts";
import { gaOnDate, formatGA, ageYears } from "@gyne/core";

export type WorkItem = DerivedAlert & { patientName: string; patientAge: number; gaLabel?: string };

export async function buildWorklist(clinicId: string, now = new Date()) {
  const patients = await prisma.patient.findMany({
    where: { clinicId },
    include: {
      readings: { where: { takenAt: { gte: subDays(now, 14) } } },
      messages: { where: { fromPatient: true, readAt: null } },
      contraceptions: { where: { endedAt: null } },
      pregnancies: { where: { active: true } },
      cycleLogs: { where: { date: { gte: subDays(now, 200) } }, orderBy: { date: "asc" } },
      alerts: { where: { resolvedAt: null } },
      prescriptions: { where: { active: true } },
      doseEvents: { where: { dueAt: { gte: subDays(now, 14) } } },
      dangerReports: { where: { handledAt: null, createdAt: { gte: subDays(now, 2) } } },
    },
  });
  const items: WorkItem[] = [];
  for (const p of patients) {
    const preg = p.pregnancies[0];
    const gaLabel = preg ? formatGA(gaOnDate(preg.eddFinal, now)) : undefined;
    for (const a of deriveAlerts(p, now)) items.push({ ...a, patientName: p.name, patientAge: ageYears(p.birthDate, now), gaLabel });
  }
  const rank = { CRITICAL: 0, WARNING: 1, INFO: 2 };
  items.sort((a, b) => rank[a.severity] - rank[b.severity] || b.at.getTime() - a.at.getTime());

  const [todayAppts, pregnant, contraDue] = await Promise.all([
    prisma.appointment.findMany({ where: { patient: { clinicId }, startsAt: { gte: startOfDay(now), lte: endOfDay(now) } }, include: { patient: true }, orderBy: { startsAt: "asc" } }),
    prisma.pregnancy.count({ where: { active: true, patient: { clinicId } } }),
    prisma.contraception.count({ where: { endedAt: null, patient: { clinicId }, expiresAt: { gte: now, lte: addDays(now, 30) } } }),
  ]);
  return {
    items,
    stats: {
      critical: items.filter((i) => i.severity === "CRITICAL").length,
      apptsToday: todayAppts.length,
      noShows: todayAppts.filter((a) => a.status === "NO_SHOW").length,
      pregnant,
      contraDue,
    },
    todayAppts,
  };
}
