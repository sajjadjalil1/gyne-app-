import { addDays, addMinutes, differenceInCalendarDays, isSameDay, set, startOfDay } from "date-fns";

/**
 * Medicine reminders: the clinic prescribes once, the app schedules.
 * Everything here is pure so it runs on the server and in the app alike.
 */

export type TimingRule = "ANY" | "MORNING" | "BEDTIME" | "WITH_FOOD" | "EMPTY_STOMACH" | "AWAY_FROM_IRON";

export type FormularyItem = { key: string; label: string; emoji: string; defaultDose: string; timing: TimingRule; timesPerDay: number; criticality: "HIGH" | "NORMAL"; note?: string };

/** Clinic formulary. Doses are typical guideline positions; the clinic edits them per patient. */
export const FORMULARY: FormularyItem[] = [
  { key: "FOLIC", label: "حمض الفوليك", emoji: "🟡", defaultDose: "حبة وحدة", timing: "ANY", timesPerDay: 1, criticality: "NORMAL" },
  { key: "IRON", label: "حبة الحديد", emoji: "🟤", defaultDose: "حبة وحدة", timing: "EMPTY_STOMACH", timesPerDay: 1, criticality: "NORMAL", note: "بعيد عن الچاي والحليب بساعتين" },
  { key: "CALCIUM", label: "الكالسيوم", emoji: "⚪", defaultDose: "حبة وحدة", timing: "AWAY_FROM_IRON", timesPerDay: 2, criticality: "NORMAL", note: "بعيد عن الحديد" },
  { key: "VITD", label: "فيتامين د", emoji: "☀️", defaultDose: "حبة وحدة", timing: "WITH_FOOD", timesPerDay: 1, criticality: "NORMAL" },
  { key: "ASPIRIN", label: "أسبرين صغير", emoji: "🟠", defaultDose: "حبة وحدة", timing: "BEDTIME", timesPerDay: 1, criticality: "HIGH", note: "لحد الأسبوع 36" },
  { key: "PROGESTERONE", label: "تحميلة البروجسترون", emoji: "🟣", defaultDose: "تحميلة وحدة", timing: "BEDTIME", timesPerDay: 1, criticality: "HIGH" },
  { key: "ENOXAPARIN", label: "إبرة المميّع", emoji: "💉", defaultDose: "إبرة وحدة", timing: "ANY", timesPerDay: 1, criticality: "HIGH" },
  { key: "LEVOTHYROXINE", label: "حبة الغدة", emoji: "🔵", defaultDose: "حبة وحدة", timing: "EMPTY_STOMACH", timesPerDay: 1, criticality: "HIGH", note: "قبل الفطور بنص ساعة" },
  { key: "METFORMIN", label: "حبة السكر", emoji: "🟢", defaultDose: "حبة وحدة", timing: "WITH_FOOD", timesPerDay: 2, criticality: "HIGH" },
  { key: "OTHER", label: "دواء آخر", emoji: "💊", defaultDose: "حبة وحدة", timing: "ANY", timesPerDay: 1, criticality: "NORMAL" },
];
export const formularyItem = (key: string) => FORMULARY.find((f) => f.key === key) ?? FORMULARY[FORMULARY.length - 1];

export const TIMING_LABEL: Record<TimingRule, string> = {
  ANY: "أي وقت", MORNING: "الصبح", BEDTIME: "بالليل قبل النوم", WITH_FOOD: "ويا الأكل", EMPTY_STOMACH: "على معدة فارغة", AWAY_FROM_IRON: "بعيد عن الحديد",
};

const hm = (s: string) => { const [h, m] = s.split(":").map(Number); return { h, m }; };
const toHM = (mins: number) => `${String(Math.floor(mins / 60) % 24).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
const minutes = (s: string) => { const { h, m } = hm(s); return h * 60 + m; };

/**
 * Timetable builder: from wake and sleep times and each medicine's timing rule,
 * propose clock times that keep iron 2 hours away from calcium and levothyroxine
 * before breakfast. The patient only confirms.
 */
export function buildTimetable(items: { timing: TimingRule; timesPerDay: number; drug: string }[], wake = "07:00", sleep = "23:00", ramadan = false): string[][] {
  const w = minutes(wake), s = minutes(sleep);
  const breakfast = ramadan ? s - 30 : w + 60;             // Ramadan: "breakfast" is iftar at sunset (approximated by sleep−30)
  const suhoor = w - 60;
  const bed = s - 30;
  const span = Math.max(240, bed - breakfast);
  return items.map((it) => {
    const n = Math.max(1, Math.min(4, it.timesPerDay));
    const slots: number[] = [];
    if (it.timing === "BEDTIME") slots.push(bed);
    else if (it.timing === "MORNING") slots.push(ramadan ? suhoor : w + 30);
    else if (it.drug === "LEVOTHYROXINE" || (it.timing === "EMPTY_STOMACH" && it.drug !== "IRON")) slots.push(ramadan ? suhoor - 30 : w);
    else if (it.drug === "IRON") slots.push(ramadan ? suhoor : w + 210);          // mid-morning, away from breakfast tea
    else if (it.timing === "AWAY_FROM_IRON") { slots.push(ramadan ? breakfast + 60 : w + 420); if (n > 1) slots.push(bed - 90); }
    else if (it.timing === "WITH_FOOD") { slots.push(breakfast); if (n > 1) slots.push(ramadan ? suhoor : breakfast + span / 2); }
    else slots.push(breakfast + 60);
    while (slots.length < n) slots.push(slots[slots.length - 1] + Math.round(span / n));
    return slots.slice(0, n).map((x) => toHM(Math.max(0, Math.min(23 * 60 + 59, Math.round(x))) ));
  });
}

export type RxLike = { id: string; drug: string; label: string; dose: string; timesPerDay: number; timing: TimingRule; times?: string | null; startAt?: Date | null; startWeek?: number | null; stopAt?: Date | null; stopWeek?: number | null; criticality: "HIGH" | "NORMAL"; active: boolean };

/** Is the prescription active on `day`? Gestational-week rules move with the EDD. */
export function rxActiveOn(rx: RxLike, day: Date, gaWeeks: number | null): boolean {
  if (!rx.active) return false;
  const d = startOfDay(day);
  if (rx.startAt && d < startOfDay(rx.startAt)) return false;
  if (rx.stopAt && d > startOfDay(rx.stopAt)) return false;
  if (gaWeeks != null) {
    if (rx.startWeek != null && gaWeeks < rx.startWeek) return false;
    if (rx.stopWeek != null && gaWeeks >= rx.stopWeek) return false;
  } else if (rx.startWeek != null || rx.stopWeek != null) return false;
  return true;
}

/** Scheduled dose times for one prescription on one day. */
export function doseTimes(rx: RxLike, day: Date, wake: string, sleep: string, ramadan: boolean): Date[] {
  const fixed = rx.times?.split(",").map((x) => x.trim()).filter(Boolean);
  const times = fixed && fixed.length ? fixed : buildTimetable([{ timing: rx.timing, timesPerDay: rx.timesPerDay, drug: rx.drug }], wake, sleep, ramadan)[0];
  return times.map((t) => { const { h, m } = hm(t); return set(startOfDay(day), { hours: h, minutes: m, seconds: 0, milliseconds: 0 }); });
}

export type DoseLike = { prescriptionId?: string | null; dueAt: Date; status: "TAKEN" | "LATE" | "SKIPPED" | "MISSED" };

/** Days covered out of the last `days` days (a day counts when every scheduled dose was taken or late). */
export function adherence(rx: RxLike, events: DoseLike[], days: number, now: Date, gaWeeksOn: (d: Date) => number | null, wake: string, sleep: string, ramadan: boolean) {
  let scheduled = 0, covered = 0;
  const dots: ("full" | "part" | "none" | "na")[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = addDays(startOfDay(now), -i);
    if (!rxActiveOn(rx, day, gaWeeksOn(day))) { dots.push("na"); continue; }
    const due = doseTimes(rx, day, wake, sleep, ramadan).filter((t) => t <= now);
    if (!due.length) { dots.push("na"); continue; }
    scheduled++;
    const taken = due.filter((t) => events.some((e) => e.prescriptionId === rx.id && isSameDay(e.dueAt, t) && Math.abs(e.dueAt.getTime() - t.getTime()) < 60_000 && (e.status === "TAKEN" || e.status === "LATE"))).length;
    if (taken === due.length) { covered++; dots.push("full"); } else dots.push(taken ? "part" : "none");
  }
  return { scheduled, covered, pct: scheduled ? Math.round((covered / scheduled) * 100) : null, dots };
}

/** Consecutive days (ending yesterday or today) with no dose taken. Worklist flags use this. */
export function missedStreak(rx: RxLike, events: DoseLike[], now: Date, gaWeeksOn: (d: Date) => number | null, wake: string, sleep: string, ramadan: boolean): number {
  let streak = 0;
  for (let i = 0; i < 14; i++) {
    const day = addDays(startOfDay(now), -i);
    if (!rxActiveOn(rx, day, gaWeeksOn(day))) break;
    const due = doseTimes(rx, day, wake, sleep, ramadan).filter((t) => addMinutes(t, 120) <= now);
    if (!due.length) continue;
    const any = due.some((t) => events.some((e) => e.prescriptionId === rx.id && Math.abs(e.dueAt.getTime() - t.getTime()) < 60_000 && (e.status === "TAKEN" || e.status === "LATE")));
    if (any) break;
    streak++;
  }
  return streak;
}

/** Contraceptive pill packs. */
export type PackType = "P21_7" | "P24_4" | "P28" | "POP";
export const PACKS: Record<PackType, { label: string; active: number; free: number; windowHours: number }> = {
  P21_7: { label: "باكيت 21 حبة", active: 21, free: 7, windowHours: 24 },
  P24_4: { label: "باكيت 24 حبة + 4 فارغة", active: 24, free: 4, windowHours: 24 },
  P28: { label: "باكيت 28 حبة", active: 28, free: 0, windowHours: 24 },
  POP: { label: "حبوب البروجستين (كل يوم بنفس الساعة)", active: 28, free: 0, windowHours: 3 },
};
export function pillState(pack: PackType, packStartedAt: Date, today: Date) {
  const p = PACKS[pack];
  const len = p.active + p.free;
  const dayIndex = ((differenceInCalendarDays(startOfDay(today), startOfDay(packStartedAt)) % len) + len) % len; // 0-based within cycle
  const cycleStart = addDays(startOfDay(today), -dayIndex);
  const inFree = dayIndex >= p.active;
  return {
    pillNumber: inFree ? null : dayIndex + 1,
    inFree,
    freeFrom: p.free ? addDays(cycleStart, p.active) : null,
    freeTo: p.free ? addDays(cycleStart, len - 1) : null,
    nextPackAt: addDays(cycleStart, len),
    cycleStart,
    activeCount: p.active,
  };
}
