import { addDays, differenceInCalendarDays, startOfDay } from "date-fns";

/** Gestational age expressed as weeks + days. */
export type GA = { weeks: number; days: number; totalDays: number };

export const TERM_DAYS = 280;

export function gaFromDays(totalDays: number): GA {
  const t = Math.max(0, totalDays);
  return { weeks: Math.floor(t / 7), days: t % 7, totalDays: t };
}

export function formatGA(ga: GA): string {
  return `${ga.weeks}+${ga.days}`;
}

/** Naegele: EDD = LMP + 280 days. */
export function eddFromLmp(lmp: Date): Date {
  return addDays(startOfDay(lmp), TERM_DAYS);
}

/** EDD from an ultrasound that measured a gestational age (in days) on a given date. */
export function eddFromUltrasound(usDate: Date, usGaDays: number): Date {
  return addDays(startOfDay(usDate), TERM_DAYS - usGaDays);
}

/** GA on a given date for a known EDD. */
export function gaOnDate(edd: Date, on: Date = new Date()): GA {
  const daysToEdd = differenceInCalendarDays(startOfDay(edd), startOfDay(on));
  return gaFromDays(TERM_DAYS - daysToEdd);
}

/**
 * ACOG Committee Opinion 700: when the ultrasound-derived date differs from the
 * LMP-derived date by more than the threshold for that gestational age, the
 * ultrasound date is used.
 */
export function redatingThresholdDays(usGaDays: number): number {
  if (usGaDays <= 8 * 7 + 6) return 5;
  if (usGaDays <= 15 * 7 + 6) return 7;
  if (usGaDays <= 21 * 7 + 6) return 10;
  if (usGaDays <= 27 * 7 + 6) return 14;
  return 21;
}

export type Dating = {
  eddFinal: Date;
  method: "LMP" | "ULTRASOUND";
  eddLmp?: Date;
  eddUs?: Date;
  discrepancyDays?: number;
};

export function resolveDating(input: { lmp?: Date | null; usDate?: Date | null; usGaDays?: number | null }): Dating {
  const eddLmp = input.lmp ? eddFromLmp(input.lmp) : undefined;
  const eddUs = input.usDate && input.usGaDays != null ? eddFromUltrasound(input.usDate, input.usGaDays) : undefined;
  if (eddLmp && eddUs) {
    const discrepancyDays = Math.abs(differenceInCalendarDays(eddUs, eddLmp));
    const threshold = redatingThresholdDays(input.usGaDays as number);
    const useUs = discrepancyDays > threshold;
    return { eddFinal: useUs ? eddUs : eddLmp, method: useUs ? "ULTRASOUND" : "LMP", eddLmp, eddUs, discrepancyDays };
  }
  if (eddUs) return { eddFinal: eddUs, method: "ULTRASOUND", eddUs };
  if (eddLmp) return { eddFinal: eddLmp, method: "LMP", eddLmp };
  throw new Error("Need LMP or ultrasound dating");
}

export type AntenatalItem = {
  key: string;
  title: string;
  fromWeek: number;
  toWeek: number;
  from: Date;
  to: Date;
  kind: "visit" | "scan" | "lab" | "injection";
  note?: string;
  rhOnly?: boolean;
};

/** Standard schedule (ACOG / NICE style), windows expressed in completed weeks. Editable per clinic later. */
export function antenatalSchedule(edd: Date, opts: { rhNegative?: boolean } = {}): AntenatalItem[] {
  const lmpEquivalent = addDays(startOfDay(edd), -TERM_DAYS);
  const at = (w: number, d = 0) => addDays(lmpEquivalent, w * 7 + d);
  const items: Omit<AntenatalItem, "from" | "to">[] = [
    { key: "booking", title: "زيارة التسجيل وتحاليل الحمل الأولى", fromWeek: 6, toWeek: 10, kind: "visit", note: "CBC، فصيلة الدم وRh، HBsAg، HIV، VDRL، تحليل بول، سكر صائم" },
    { key: "dating", title: "سونار التأريخ", fromWeek: 8, toWeek: 13, kind: "scan", note: "يُعتمد لتأكيد موعد الولادة" },
    { key: "nt", title: "فحص الثلث الأول (شفافية القفا)", fromWeek: 11, toWeek: 13, kind: "scan" },
    { key: "visit16", title: "زيارة 16 أسبوعاً", fromWeek: 16, toWeek: 17, kind: "visit" },
    { key: "anomaly", title: "سونار التشوّهات", fromWeek: 18, toWeek: 22, kind: "scan" },
    { key: "ogtt", title: "فحص سكر الحمل (OGTT)", fromWeek: 24, toWeek: 28, kind: "lab" },
    { key: "antid", title: "حقنة Anti-D", fromWeek: 28, toWeek: 28, kind: "injection", rhOnly: true },
    { key: "visit28", title: "زيارة 28 أسبوعاً + CBC", fromWeek: 28, toWeek: 29, kind: "visit" },
    { key: "visit32", title: "زيارة 32 أسبوعاً", fromWeek: 32, toWeek: 33, kind: "visit" },
    { key: "growth", title: "سونار نمو الجنين", fromWeek: 32, toWeek: 36, kind: "scan" },
    { key: "gbs", title: "مسحة GBS", fromWeek: 36, toWeek: 37, kind: "lab" },
    { key: "visit36", title: "زيارة 36 أسبوعاً (وضعية الجنين)", fromWeek: 36, toWeek: 37, kind: "visit" },
    { key: "visit38", title: "زيارة 38 أسبوعاً", fromWeek: 38, toWeek: 38, kind: "visit" },
    { key: "visit40", title: "زيارة 40 أسبوعاً وخطة ما بعد الموعد", fromWeek: 40, toWeek: 41, kind: "visit" },
  ];
  return items
    .filter((i) => !i.rhOnly || opts.rhNegative)
    .map((i) => ({ ...i, from: at(i.fromWeek), to: at(i.toWeek, 6) }));
}

export type Trimester = 1 | 2 | 3;
export function trimester(ga: GA): Trimester {
  if (ga.weeks < 14) return 1;
  if (ga.weeks < 28) return 2;
  return 3;
}
