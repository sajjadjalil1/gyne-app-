import { addDays, differenceInCalendarDays, startOfDay } from "date-fns";

export type CycleLogLite = { date: Date; bleeding: boolean; flow?: string | null };

export type Period = { start: Date; end: Date; days: number; spotting: boolean };

/** Group consecutive bleeding days (gaps of 1 day allowed) into periods. A cluster made only of spotting is kept but marked, so it feeds the intermenstrual check without distorting cycle length. */
export function periodsFromLogs(logs: CycleLogLite[]): Period[] {
  const days = logs
    .filter((l) => l.bleeding)
    .map((l) => ({ d: startOfDay(l.date), spotting: l.flow === "SPOTTING" }))
    .sort((a, b) => a.d.getTime() - b.d.getTime());
  const periods: Period[] = [];
  for (const { d, spotting } of days) {
    const last = periods[periods.length - 1];
    if (last && differenceInCalendarDays(d, last.end) <= 2) {
      last.end = d;
      last.days = differenceInCalendarDays(last.end, last.start) + 1;
      last.spotting = last.spotting && spotting;
    } else {
      periods.push({ start: d, end: d, days: 1, spotting });
    }
  }
  return periods;
}

/** True periods only: spotting-only clusters are ignored for cycle length and prediction. */
export function truePeriods(periods: Period[]): Period[] {
  return periods.filter((p) => !p.spotting);
}

export function cycleLengths(periods: Period[]): number[] {
  const ps = truePeriods(periods);
  const out: number[] = [];
  for (let i = 1; i < ps.length; i++) out.push(differenceInCalendarDays(ps[i].start, ps[i - 1].start));
  return out;
}

export function average(nums: number[], fallback: number): number {
  if (!nums.length) return fallback;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

export type CyclePrediction = {
  lastPeriodStart?: Date;
  cycleLength: number;
  periodLength: number;
  nextPeriod?: Date;
  ovulation?: Date;
  fertileWindow?: { from: Date; to: Date };
  dayOfCycle?: number;
  daysToNextPeriod?: number;
  daysToOvulation?: number;
};

export function predictCycle(logs: CycleLogLite[], defaults = { cycleLength: 28, periodLength: 5 }, today = new Date()): CyclePrediction {
  const periods = truePeriods(periodsFromLogs(logs));
  const recent = periods.slice(-6);
  const cycleLength = average(cycleLengths(recent).filter((n) => n >= 15 && n <= 60), defaults.cycleLength);
  const periodLength = average(recent.map((p) => p.days), defaults.periodLength);
  const last = periods[periods.length - 1];
  if (!last) return { cycleLength, periodLength };
  const t = startOfDay(today);
  let nextPeriod = addDays(last.start, cycleLength);
  while (differenceInCalendarDays(nextPeriod, t) < -3) nextPeriod = addDays(nextPeriod, cycleLength);
  const ovulation = addDays(nextPeriod, -14);
  return {
    lastPeriodStart: last.start,
    cycleLength,
    periodLength,
    nextPeriod,
    ovulation,
    fertileWindow: { from: addDays(ovulation, -5), to: addDays(ovulation, 1) },
    dayOfCycle: differenceInCalendarDays(t, last.start) + 1,
    daysToNextPeriod: differenceInCalendarDays(nextPeriod, t),
    daysToOvulation: differenceInCalendarDays(ovulation, t),
  };
}

export type CycleFlag = { kind: string; severity: "WARNING" | "CRITICAL" | "INFO"; title: string; detail: string };

/** Clinical flags the consumer trackers do not surface. Thresholds are the common textbook ones; the clinic can tune them later. */
export function cycleFlags(logs: CycleLogLite[], today = new Date()): CycleFlag[] {
  const flags: CycleFlag[] = [];
  const periods = periodsFromLogs(logs);
  const lengths = cycleLengths(periods).slice(-3);
  const real = truePeriods(periods);
  const last = real[real.length - 1];
  if (last) {
    const since = differenceInCalendarDays(startOfDay(today), last.start);
    if (since > 90) flags.push({ kind: "AMENORRHEA", severity: "WARNING", title: "انقطاع الدورة أكثر من 90 يوماً", detail: `آخر دورة بدأت قبل ${since} يوماً.` });
    if (last.days > 7) flags.push({ kind: "PROLONGED", severity: "WARNING", title: "نزف أطول من 7 أيام", detail: `آخر دورة استمرت ${last.days} أيام.` });
  }
  const short = lengths.filter((n) => n < 21);
  const long = lengths.filter((n) => n > 35);
  if (short.length) flags.push({ kind: "SHORT_CYCLE", severity: "WARNING", title: "دورة أقصر من 21 يوماً", detail: `أطوال الدورات الأخيرة: ${lengths.join("، ")} يوماً.` });
  if (long.length >= 2) flags.push({ kind: "LONG_CYCLE", severity: "WARNING", title: "دورات أطول من 35 يوماً", detail: `أطوال الدورات الأخيرة: ${lengths.join("، ")} يوماً.` });
  // Intermenstrual bleeding: a bleeding cluster of 1–2 days that starts less than 15 days after the previous one.
  for (let i = 1; i < periods.length; i++) {
    const gap = differenceInCalendarDays(periods[i].start, periods[i - 1].end);
    if (periods[i].days <= 2 && gap > 2 && gap < 15) {
      flags.push({ kind: "INTERMENSTRUAL", severity: "WARNING", title: "نزف بين الدورتين", detail: `نزف قصير بعد ${gap} يوماً من نهاية الدورة السابقة.` });
      break;
    }
  }
  return flags;
}
