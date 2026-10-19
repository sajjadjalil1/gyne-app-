import { prisma } from "@gyne/db";
import { antenatalSchedule, formatGA, gaOnDate, methodLabel, predictCycle, renewalReminderDate, trimester, type MethodKey } from "@gyne/core";
import { startOfDay, subDays } from "date-fns";

/** Everything the patient's home screen needs, computed server-side so the app stays thin. */
export async function patientHome(patientId: string, now = new Date()) {
  const p = await prisma.patient.findUniqueOrThrow({
    where: { id: patientId },
    include: {
      cycleLogs: { where: { date: { gte: subDays(now, 400) } }, orderBy: { date: "asc" } },
      contraceptions: { where: { endedAt: null }, orderBy: { startedAt: "desc" }, take: 1 },
      pregnancies: { where: { active: true }, take: 1 },
      appointments: { where: { status: "SCHEDULED", startsAt: { gte: startOfDay(now) } }, orderBy: { startsAt: "asc" }, take: 3 },
      readings: { orderBy: { takenAt: "desc" }, take: 30 },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  const pregnancy = p.pregnancies[0];
  const preg = pregnancy
    ? (() => {
        const ga = gaOnDate(pregnancy.eddFinal, now);
        const schedule = antenatalSchedule(pregnancy.eddFinal, { rhNegative: pregnancy.rhNegative });
        const upcoming = schedule.filter((s) => s.to >= startOfDay(now)).slice(0, 4);
        return { id: pregnancy.id, edd: pregnancy.eddFinal, ga, gaLabel: formatGA(ga), trimester: trimester(ga), daysLeft: 280 - ga.totalDays, datingMethod: pregnancy.datingMethod, rhNegative: pregnancy.rhNegative, upcoming };
      })()
    : null;

  const cycle = predictCycle(p.cycleLogs, { cycleLength: p.cycleLengthAvg, periodLength: p.periodLengthAvg }, now);
  const contra = p.contraceptions[0];
  const contraception = contra
    ? { id: contra.id, method: contra.method, label: methodLabel(contra.method), brand: contra.brand, startedAt: contra.startedAt, expiresAt: contra.expiresAt, reminderAt: contra.expiresAt ? renewalReminderDate(contra.method as MethodKey, contra.expiresAt) : null }
    : null;

  const bp = p.readings.filter((r) => r.kind === "BP").slice(0, 7).reverse();
  const kicks = p.readings.find((r) => r.kind === "KICKS");
  const unread = await prisma.message.count({ where: { patientId, fromPatient: false, readAt: null } });

  return {
    patient: { id: p.id, name: p.name, firstName: p.name.split(" ")[0] },
    today: startOfDay(now),
    pregnancy: preg,
    cycle: preg ? null : cycle,
    contraception,
    nextAppointments: p.appointments,
    bp: bp.map((r) => ({ at: r.takenAt, systolic: r.systolic, diastolic: r.diastolic })),
    kicks: kicks ? { at: kicks.takenAt, count: kicks.value } : null,
    unreadMessages: unread,
    lastMessage: p.messages[0] ?? null,
  };
}

export type PatientHome = Awaited<ReturnType<typeof patientHome>>;
