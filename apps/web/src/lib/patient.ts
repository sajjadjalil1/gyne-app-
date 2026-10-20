import { prisma } from "@gyne/db";
import {
  adherence, ancPlain, antenatalSchedule, babySize, bpLevel, doseTimes, formatGA, formularyItem, gaOnDate, methodLabel, monthLabel, pillState,
  predictCycle, pregnancyMonth, renewalReminderDate, rxActiveOn, trimester, type MethodKey, type PackType, type RxLike,
} from "@gyne/core";
import { addDays, differenceInCalendarDays, startOfDay, subDays } from "date-fns";

/** Everything the patient's home screen needs, computed server-side so the app stays thin. */
export async function patientHome(patientId: string, now = new Date()) {
  const p = await prisma.patient.findUniqueOrThrow({
    where: { id: patientId },
    include: {
      clinic: true,
      cycleLogs: { where: { date: { gte: subDays(now, 400) } }, orderBy: { date: "asc" } },
      contraceptions: { where: { endedAt: null }, orderBy: { startedAt: "desc" }, take: 1 },
      pregnancies: { where: { active: true }, take: 1 },
      appointments: { where: { startsAt: { gte: subDays(now, 365) } }, orderBy: { startsAt: "desc" } },
      readings: { orderBy: { takenAt: "desc" }, take: 30 },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      prescriptions: { where: { active: true }, orderBy: { createdAt: "asc" } },
      doseEvents: { where: { dueAt: { gte: subDays(now, 31) } } },
      dangerReports: { where: { createdAt: { gte: subDays(now, 2) } }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  const doctor = await prisma.user.findFirst({ where: { clinicId: p.clinicId, role: "DOCTOR" }, select: { name: true } });

  const pregnancy = p.pregnancies[0];
  const gaWeeksOn = (d: Date) => (pregnancy ? gaOnDate(pregnancy.eddFinal, d).weeks : null);
  const completed = p.appointments.filter((a) => a.status === "COMPLETED");
  const preg = pregnancy
    ? (() => {
        const ga = gaOnDate(pregnancy.eddFinal, now);
        const schedule = antenatalSchedule(pregnancy.eddFinal, { rhNegative: pregnancy.rhNegative });
        const plan = schedule.map((s) => {
          const plain = ancPlain(s.key, s.title);
          const done = completed.some((a) => a.startsAt >= s.from && a.startsAt <= addDays(s.to, 7));
          const status: "done" | "now" | "later" | "past" = done ? "done" : s.to < startOfDay(now) ? "past" : s.from <= addDays(now, 7) ? "now" : "later";
          return { key: s.key, title: plain.title, what: plain.what, prep: plain.prep, fromWeek: s.fromWeek, toWeek: s.toWeek, from: s.from, to: s.to, month: monthLabel(pregnancyMonth({ weeks: s.fromWeek, days: 0, totalDays: s.fromWeek * 7 })), status };
        });
        const month = pregnancyMonth(ga);
        return { id: pregnancy.id, edd: pregnancy.eddFinal, ga, gaLabel: formatGA(ga), month, monthLabel: monthLabel(month), trimester: trimester(ga), daysLeft: 280 - ga.totalDays, baby: babySize(ga.weeks), datingMethod: pregnancy.datingMethod, rhNegative: pregnancy.rhNegative, plan, upcoming: plan.filter((x) => x.status === "now" || x.status === "later").slice(0, 3) };
      })()
    : null;

  const cycle = predictCycle(p.cycleLogs, { cycleLength: p.cycleLengthAvg, periodLength: p.periodLengthAvg }, now);
  const contra = p.contraceptions[0];
  const isPill = contra && (contra.method === "COMBINED_PILL" || contra.method === "PROGESTIN_PILL") && contra.packType && contra.packStartedAt;
  const pill = isPill
    ? (() => {
        const st = pillState(contra.packType as PackType, contra.packStartedAt as Date, now);
        const takenToday = p.doseEvents.some((e) => e.contraceptionId === contra.id && differenceInCalendarDays(now, e.dueAt) === 0 && (e.status === "TAKEN" || e.status === "LATE"));
        const last7 = Array.from({ length: 7 }, (_, i) => { const day = subDays(startOfDay(now), 6 - i); return p.doseEvents.some((e) => e.contraceptionId === contra.id && differenceInCalendarDays(day, e.dueAt) === 0 && (e.status === "TAKEN" || e.status === "LATE")); });
        return { ...st, packType: contra.packType, pillTime: contra.pillTime ?? "21:00", takenToday, last7, packStartedAt: contra.packStartedAt };
      })()
    : null;
  const contraception = contra
    ? { id: contra.id, method: contra.method, label: methodLabel(contra.method), brand: contra.brand, startedAt: contra.startedAt, expiresAt: contra.expiresAt, reminderAt: contra.expiresAt ? renewalReminderDate(contra.method as MethodKey, contra.expiresAt) : null, pill }
    : null;

  // Medicines for today
  const rxs = p.prescriptions as unknown as (RxLike & { indication: string | null; source: string; reviewedAt: Date | null; strength: string | null; supplyCount: number | null; supplyAt: Date | null })[];
  const events = p.doseEvents.map((e) => ({ prescriptionId: e.prescriptionId, dueAt: e.dueAt, status: e.status }));
  const meds = rxs.filter((rx) => rxActiveOn(rx, now, gaWeeksOn(now))).map((rx) => {
    const f = formularyItem(rx.drug);
    const times = doseTimes(rx, now, p.wakeTime, p.sleepTime, p.ramadanMode);
    const doses = times.map((t) => {
      const ev = p.doseEvents.find((e) => e.prescriptionId === rx.id && Math.abs(e.dueAt.getTime() - t.getTime()) < 60_000);
      return { dueAt: t, status: ev?.status ?? null, loggedAt: ev?.loggedAt ?? null };
    });
    const week = adherence(rx, events, 7, now, gaWeeksOn, p.wakeTime, p.sleepTime, p.ramadanMode);
    const stopNote = rx.stopWeek ? `لحد الأسبوع ${rx.stopWeek}` : rx.stopAt ? `لحد ${rx.stopAt.toISOString().slice(0, 10)}` : null;
    return { id: rx.id, drug: rx.drug, emoji: f.emoji, label: rx.label, dose: rx.dose, timing: rx.timing, note: f.note ?? null, stopNote, criticality: rx.criticality, source: rx.source, doses, week: week.dots, weekCovered: week.covered, weekScheduled: week.scheduled };
  });
  const finished = rxs.filter((rx) => !rxActiveOn(rx, now, gaWeeksOn(now)) && rx.stopWeek != null && gaWeeksOn(now) != null && (gaWeeksOn(now) as number) >= rx.stopWeek).map((rx) => ({ label: rx.label, stopWeek: rx.stopWeek }));
  // A day counts as covered when every scheduled medicine was taken that day.
  const weekDots = Array.from({ length: 7 }, (_, i) => { const col = meds.filter((m) => m.source === "PRESCRIBED").map((m) => m.week[i]).filter((x) => x !== "na"); return col.length === 0 ? "na" : col.every((x) => x === "full") ? "full" : col.some((x) => x === "full" || x === "part") ? "part" : "none"; }) as ("full" | "part" | "none" | "na")[];
  const allDoseDays = weekDots.filter((x) => x !== "na").length;
  const allCovered = weekDots.filter((x) => x === "full").length;

  const bpReadings = p.readings.filter((r) => r.kind === "BP").slice(0, 7).reverse();
  const latestBp = bpReadings[bpReadings.length - 1];
  const bp = latestBp ? { at: latestBp.takenAt, systolic: latestBp.systolic as number, diastolic: latestBp.diastolic as number, level: bpLevel(latestBp.systolic as number, latestBp.diastolic as number), today: differenceInCalendarDays(now, latestBp.takenAt) === 0 } : null;
  const kicks = p.readings.find((r) => r.kind === "KICKS");
  const unread = await prisma.message.count({ where: { patientId, fromPatient: false, readAt: null } });
  const todayLog = p.cycleLogs.find((l) => differenceInCalendarDays(now, l.date) === 0);
  const danger = p.dangerReports[0] ? { at: p.dangerReports[0].createdAt, signs: p.dangerReports[0].signs.split(","), handled: !!p.dangerReports[0].handledAt } : null;

  const next = p.appointments.filter((a) => a.status === "SCHEDULED" && a.startsAt >= startOfDay(now)).sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime()).slice(0, 3);
  const past = completed.sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime()).slice(0, 5);

  return {
    patient: { id: p.id, name: p.name, firstName: p.name.split(" ")[0], phone: p.phone, wakeTime: p.wakeTime, sleepTime: p.sleepTime, ramadanMode: p.ramadanMode, detailedNotifications: p.detailedNotifications },
    clinic: { name: p.clinic.name, phone: p.clinic.phone, address: p.clinic.address, mapsUrl: p.clinic.mapsUrl, nurseHours: p.clinic.nurseHours, replyHours: p.clinic.replyHours, erHospital: p.clinic.erHospital, erMapsUrl: p.clinic.erMapsUrl, doctorName: doctor?.name ?? null, missedPillOne: p.clinic.missedPillOne, missedPillTwo: p.clinic.missedPillTwo, fastingAdvice: p.clinic.fastingAdvice },
    today: startOfDay(now),
    mode: preg ? "pregnancy" : pill ? "pill" : "cycle",
    pregnancy: preg,
    cycle: preg ? null : cycle,
    contraception,
    nextAppointments: next.map((a) => ({ id: a.id, type: a.type, startsAt: a.startsAt, reason: a.reason, prep: a.prep, place: a.place, confirmed: a.confirmed })),
    pastVisits: past.map((a) => ({ id: a.id, type: a.type, startsAt: a.startsAt, notes: a.notes, fetalHr: a.fetalHr, weightKg: a.weightKg, scanNote: a.scanNote })),
    meds, finishedMeds: finished, weekDots, weekCovered: allCovered, weekScheduled: allDoseDays,
    bp, bpHistory: bpReadings.map((r) => ({ at: r.takenAt, systolic: r.systolic, diastolic: r.diastolic })),
    kicks: kicks ? { at: kicks.takenAt, count: kicks.value, today: differenceInCalendarDays(now, kicks.takenAt) === 0 } : null,
    todayLog: todayLog ? { feeling: todayLog.mood, symptoms: todayLog.symptoms?.split(",").filter(Boolean) ?? [], bleeding: todayLog.bleeding, flow: todayLog.flow } : null,
    danger,
    unreadMessages: unread,
    lastMessage: p.messages[0] ?? null,
  };
}

export type PatientHome = Awaited<ReturnType<typeof patientHome>>;
