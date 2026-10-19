import { addDays, differenceInCalendarDays, differenceInHours, startOfDay } from "date-fns";
import type { Alert, Contraception, HomeReading, Message, Patient, Pregnancy, CycleLog } from "@gyne/db";
import { cycleFlags } from "@gyne/core";
import { antenatalSchedule, gaOnDate, formatGA } from "@gyne/core";
import { methodLabel } from "@gyne/core";
import { fmtDate } from "@gyne/core";

export type Severity = "CRITICAL" | "WARNING" | "INFO";

export type DerivedAlert = {
  patientId: string;
  severity: Severity;
  kind: string;
  title: string;
  detail: string;
  at: Date;
};

export type PatientBundle = Patient & {
  readings: HomeReading[];
  messages: Message[];
  contraceptions: Contraception[];
  pregnancies: Pregnancy[];
  cycleLogs: CycleLog[];
  alerts: Alert[];
};

export const BP_LIMITS = { sysWarn: 140, diaWarn: 90, sysCrit: 160, diaCrit: 110 };

/**
 * Rules are intentionally simple and transparent: the dashboard shows them as
 * "your clinic's rule", not as a diagnosis. Thresholds become clinic settings later.
 */
export function deriveAlerts(p: PatientBundle, now = new Date()): DerivedAlert[] {
  const out: DerivedAlert[] = [];
  const activePreg = p.pregnancies.find((x) => x.active);

  // Blood pressure (pregnancy or not)
  const bps = p.readings.filter((r) => r.kind === "BP" && r.systolic != null && r.diastolic != null).sort((a, b) => b.takenAt.getTime() - a.takenAt.getTime());
  const latest = bps[0];
  if (latest) {
    const sys = latest.systolic as number, dia = latest.diastolic as number;
    const high = sys >= BP_LIMITS.sysWarn || dia >= BP_LIMITS.diaWarn;
    const severe = sys >= BP_LIMITS.sysCrit || dia >= BP_LIMITS.diaCrit;
    const prev = bps.find((r) => r.id !== latest.id && differenceInHours(latest.takenAt, r.takenAt) <= 48);
    const prevHigh = prev && ((prev.systolic as number) >= BP_LIMITS.sysWarn || (prev.diastolic as number) >= BP_LIMITS.diaWarn);
    if (severe) out.push({ patientId: p.id, severity: "CRITICAL", kind: "BP_SEVERE", title: `ضغط ${sys}/${dia}`, detail: "قراءة شديدة الارتفاع. اتصلي بالمريضة الآن.", at: latest.takenAt });
    else if (high && prevHigh) out.push({ patientId: p.id, severity: "CRITICAL", kind: "BP_HIGH_X2", title: `ضغط ${sys}/${dia}`, detail: `فوق ${BP_LIMITS.sysWarn}/${BP_LIMITS.diaWarn} مرتين خلال 48 ساعة (السابقة ${prev!.systolic}/${prev!.diastolic}).`, at: latest.takenAt });
    else if (high) out.push({ patientId: p.id, severity: "WARNING", kind: "BP_HIGH", title: `ضغط ${sys}/${dia}`, detail: "قراءة واحدة مرتفعة. اطلبي إعادة القياس بعد 4 ساعات.", at: latest.takenAt });
  }

  // Unanswered patient messages
  const unread = p.messages.filter((m) => m.fromPatient && !m.readAt).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  if (unread.length) {
    const oldest = unread[0];
    const hrs = differenceInHours(now, oldest.createdAt);
    const urgent = /نزف|حركة|صداع|ماء|تقلص|ألم شديد/.test(unread.map((m) => m.body).join(" "));
    out.push({ patientId: p.id, severity: urgent ? "CRITICAL" : hrs >= 4 ? "WARNING" : "INFO", kind: "MESSAGE", title: `رسالة بلا رد: «${oldest.body.slice(0, 40)}${oldest.body.length > 40 ? "…" : ""}»`, detail: unread.length > 1 ? `${unread.length} رسائل بانتظار الرد.` : "بانتظار الرد.", at: oldest.createdAt });
  }

  // Pregnancy screening windows
  if (activePreg) {
    const ga = gaOnDate(activePreg.eddFinal, now);
    for (const item of antenatalSchedule(activePreg.eddFinal, { rhNegative: activePreg.rhNegative })) {
      const daysLeft = differenceInCalendarDays(item.to, now);
      const started = differenceInCalendarDays(now, item.from) >= 0;
      if (started && daysLeft >= 0 && daysLeft <= 21 && (item.kind === "lab" || item.kind === "scan" || item.kind === "injection")) {
        out.push({ patientId: p.id, severity: daysLeft <= 7 ? "WARNING" : "INFO", kind: `ANC_${item.key}`, title: `${item.title} مستحق`, detail: `عمر الحمل ${formatGA(ga)}. النافذة تنتهي ${fmtDate(item.to, { year: false })}.`, at: item.from });
      }
    }
    // Reduced fetal movement: kicks reading below 10 after 28 weeks
    const kicks = p.readings.filter((r) => r.kind === "KICKS").sort((a, b) => b.takenAt.getTime() - a.takenAt.getTime())[0];
    if (kicks && ga.weeks >= 28 && (kicks.value ?? 10) < 10 && differenceInHours(now, kicks.takenAt) <= 24) {
      out.push({ patientId: p.id, severity: "CRITICAL", kind: "KICKS_LOW", title: `حركات الجنين ${kicks.value} فقط`, detail: "أقل من 10 حركات في جلسة العدّ. تواصلي مع المريضة.", at: kicks.takenAt });
    }
  }

  // Contraception expiry
  const current = p.contraceptions.find((c) => !c.endedAt);
  if (current?.expiresAt) {
    const d = differenceInCalendarDays(current.expiresAt, now);
    if (d < 0) out.push({ patientId: p.id, severity: "WARNING", kind: "CONTRA_EXPIRED", title: `${methodLabel(current.method)} منتهية منذ ${-d} يوماً`, detail: "لا يوجد موعد إزالة أو تبديل.", at: current.expiresAt });
    else if (d <= 30) out.push({ patientId: p.id, severity: "WARNING", kind: "CONTRA_EXPIRING", title: `${methodLabel(current.method)} تنتهي بعد ${d} يوماً`, detail: `رُكّبت ${fmtDate(current.startedAt)}. احجزي موعد الإزالة أو التبديل.`, at: addDays(current.expiresAt, -30) });
  }

  // Cycle flags (not pregnant)
  if (!activePreg) {
    for (const f of cycleFlags(p.cycleLogs, now)) {
      out.push({ patientId: p.id, severity: f.severity, kind: f.kind, title: f.title, detail: f.detail, at: startOfDay(now) });
    }
  }

  const rank = { CRITICAL: 0, WARNING: 1, INFO: 2 };
  return out.sort((a, b) => rank[a.severity] - rank[b.severity] || b.at.getTime() - a.at.getTime());
}
