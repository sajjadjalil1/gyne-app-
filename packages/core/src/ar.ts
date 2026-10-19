import { differenceInCalendarDays, differenceInMinutes, differenceInHours, differenceInYears } from "date-fns";

const months = ["كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران", "تموز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "كانون الأول"];
const weekdays = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

export function fmtDate(d: Date, opts: { weekday?: boolean; year?: boolean } = {}): string {
  const parts = [`${d.getDate()} ${months[d.getMonth()]}`];
  if (opts.year !== false) parts.push(String(d.getFullYear()));
  const s = parts.join(" ");
  return opts.weekday ? `${weekdays[d.getDay()]} ${s}` : s;
}

export function fmtShort(d: Date): string {
  return `${d.getDate()} ${months[d.getMonth()].split(" ")[0]}`;
}

export function fmtTime(d: Date): string {
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const pm = h >= 12;
  h = h % 12 || 12;
  return `${h}:${m} ${pm ? "م" : "ص"}`;
}

export function weekdayName(d: Date): string {
  return weekdays[d.getDay()];
}

export function relTime(d: Date, now = new Date()): string {
  const mins = differenceInMinutes(now, d);
  if (mins < 1) return "الآن";
  if (mins < 60) return `قبل ${mins} د`;
  const hrs = differenceInHours(now, d);
  if (hrs < 24) return `قبل ${hrs} س`;
  const days = differenceInCalendarDays(now, d);
  if (days === 1) return "أمس";
  if (days < 7) return `قبل ${days} أيام`;
  return fmtShort(d);
}

export function ageYears(birthDate: Date, now = new Date()): number {
  return differenceInYears(now, birthDate);
}

export function plural(n: number, one: string, two: string, many: string, more: string): string {
  if (n === 1) return one;
  if (n === 2) return two;
  if (n >= 3 && n <= 10) return `${n} ${many}`;
  return `${n} ${more}`;
}

export function daysLabel(n: number): string {
  return plural(n, "يوم واحد", "يومان", "أيام", "يوماً");
}

export const APPT_TYPE_LABEL: Record<string, string> = {
  NEW_PATIENT: "مريضة جديدة",
  FOLLOW_UP: "متابعة",
  ANTENATAL: "زيارة حمل",
  ULTRASOUND: "سونار",
  CONTRACEPTION_REVIEW: "مراجعة منع الحمل",
  IUD_INSERTION: "تركيب لولب",
  IMPLANT_REMOVAL: "إزالة غرسة",
  PAP_SMEAR: "مسحة عنق الرحم",
  POSTPARTUM: "فحص ما بعد الولادة",
};

export const FLOW_LABEL: Record<string, string> = { SPOTTING: "تنقيط", LIGHT: "خفيف", MEDIUM: "متوسط", HEAVY: "غزير" };

export const MOODS: { key: string; label: string; emoji: string }[] = [
  { key: "calm", label: "هادئة", emoji: "😌" },
  { key: "happy", label: "سعيدة", emoji: "🙂" },
  { key: "loving", label: "محبّة", emoji: "💜" },
  { key: "anxious", label: "قلقة", emoji: "😟" },
  { key: "sad", label: "حزينة", emoji: "😢" },
  { key: "angry", label: "غاضبة", emoji: "😠" },
  { key: "sleepy", label: "ناعسة", emoji: "😴" },
  { key: "pain", label: "متألمة", emoji: "😣" },
];

export const SYMPTOMS: { key: string; label: string }[] = [
  { key: "cramps", label: "تقلصات" },
  { key: "headache", label: "صداع" },
  { key: "bloating", label: "انتفاخ" },
  { key: "breast", label: "ألم الثدي" },
  { key: "nausea", label: "غثيان" },
  { key: "acne", label: "حبوب" },
  { key: "discharge", label: "إفرازات" },
  { key: "fatigue", label: "إرهاق" },
];
