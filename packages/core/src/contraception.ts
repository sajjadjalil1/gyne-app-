import { addDays, addMonths, addWeeks, addYears } from "date-fns";

export type MethodKey =
  | "COMBINED_PILL" | "PROGESTIN_PILL" | "PATCH" | "RING" | "INJECTION" | "IMPLANT"
  | "IUD_HORMONAL" | "IUD_COPPER" | "CONDOM" | "FERTILITY_AWARENESS" | "NONE";

export const METHODS: Record<MethodKey, { label: string; reminder: string; expiry: (start: Date, brand?: string | null) => Date | null }> = {
  COMBINED_PILL: { label: "حبوب مركّبة", reminder: "يومياً", expiry: () => null },
  PROGESTIN_PILL: { label: "حبوب بروجستين فقط", reminder: "يومياً في نفس الساعة", expiry: () => null },
  PATCH: { label: "لصقة", reminder: "أسبوعياً", expiry: (s) => addWeeks(s, 1) },
  RING: { label: "حلقة مهبلية", reminder: "كل 3 أسابيع", expiry: (s) => addWeeks(s, 3) },
  INJECTION: { label: "حقنة (DMPA)", reminder: "كل 12 إلى 13 أسبوعاً", expiry: (s) => addWeeks(s, 13) },
  IMPLANT: { label: "غرسة تحت الجلد", reminder: "3 سنوات", expiry: (s) => addYears(s, 3) },
  IUD_HORMONAL: {
    label: "لولب هرموني",
    reminder: "حسب النوع",
    expiry: (s, brand) => {
      const b = (brand ?? "").toLowerCase();
      if (b.includes("mirena") || b.includes("liletta")) return addYears(s, 8);
      if (b.includes("kyleena")) return addYears(s, 5);
      if (b.includes("skyla") || b.includes("jaydess")) return addYears(s, 3);
      return addYears(s, 5);
    },
  },
  IUD_COPPER: { label: "لولب نحاسي", reminder: "حسب النوع", expiry: (s, brand) => ((brand ?? "").toLowerCase().includes("380") ? addYears(s, 10) : addYears(s, 5)) },
  CONDOM: { label: "واقي", reminder: "عند كل علاقة", expiry: () => null },
  FERTILITY_AWARENESS: { label: "الوعي بالخصوبة", reminder: "تتبّع يومي", expiry: () => null },
  NONE: { label: "بلا وسيلة", reminder: "", expiry: () => null },
};

export function computeExpiry(method: MethodKey, startedAt: Date, brand?: string | null): Date | null {
  return METHODS[method].expiry(startedAt, brand);
}

export function methodLabel(method: string): string {
  return METHODS[method as MethodKey]?.label ?? method;
}

/** Renewal reminder: 30 days before for long-acting methods, 7 days for short ones. */
export function renewalReminderDate(method: MethodKey, expiresAt: Date): Date {
  const longActing: MethodKey[] = ["IMPLANT", "IUD_HORMONAL", "IUD_COPPER"];
  return addDays(expiresAt, longActing.includes(method) ? -30 : -7);
}

export function nextRenewalAfter(method: MethodKey, from: Date): Date | null {
  if (method === "PATCH") return addWeeks(from, 1);
  if (method === "RING") return addWeeks(from, 3);
  if (method === "INJECTION") return addMonths(from, 3);
  return null;
}
