import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

export type DoseStatus = "TAKEN" | "LATE" | "SKIPPED" | "MISSED";
export type Dose = { dueAt: string; status: DoseStatus | null; loggedAt: string | null };
export type Med = {
  id: string; drug: string; emoji: string; label: string; dose: string; timing: string; note: string | null; stopNote: string | null;
  criticality: "HIGH" | "NORMAL"; source: "PRESCRIBED" | "SELF"; doses: Dose[]; week: ("full" | "part" | "none" | "na")[]; weekCovered: number; weekScheduled: number;
};
export type PlanItem = { key: string; title: string; what: string; prep?: string; fromWeek: number; toWeek: number; from: string; to: string; month: string; status: "done" | "now" | "later" | "past" };
export type Appt = { id: string; type: string; startsAt: string; reason: string | null; prep: string | null; place: string | null; confirmed: boolean | null };
export type Visit = { id: string; type: string; startsAt: string; notes: string | null; fetalHr: number | null; weightKg: number | null; scanNote: string | null };
export type Pill = { pillNumber: number | null; inFree: boolean; freeFrom: string | null; freeTo: string | null; nextPackAt: string; cycleStart: string; activeCount: number; packType: string; pillTime: string; takenToday: boolean; last7: boolean[]; packStartedAt: string };

export type Home = {
  patient: { id: string; name: string; firstName: string; phone: string; wakeTime: string; sleepTime: string; ramadanMode: boolean; detailedNotifications: boolean };
  clinic: { name: string; phone: string | null; address: string | null; mapsUrl: string | null; nurseHours: string | null; replyHours: number; erHospital: string | null; erMapsUrl: string | null; doctorName: string | null; missedPillOne: string | null; missedPillTwo: string | null; fastingAdvice: string | null };
  today: string;
  mode: "pregnancy" | "pill" | "cycle";
  pregnancy: null | { id: string; edd: string; ga: { weeks: number; days: number; totalDays: number }; gaLabel: string; month: number; monthLabel: string; trimester: 1 | 2 | 3; daysLeft: number; baby: { emoji: string; label: string }; datingMethod: string; rhNegative: boolean; plan: PlanItem[]; upcoming: PlanItem[] };
  cycle: null | { lastPeriodStart?: string; cycleLength: number; periodLength: number; nextPeriod?: string; ovulation?: string; fertileWindow?: { from: string; to: string }; dayOfCycle?: number; daysToNextPeriod?: number; daysToOvulation?: number };
  contraception: null | { id: string; method: string; label: string; brand: string | null; startedAt: string; expiresAt: string | null; reminderAt: string | null; pill: Pill | null };
  nextAppointments: Appt[];
  pastVisits: Visit[];
  meds: Med[]; finishedMeds: { label: string; stopWeek: number | null }[]; weekDots: ("full" | "part" | "none" | "na")[]; weekCovered: number; weekScheduled: number;
  bp: null | { at: string; systolic: number; diastolic: number; level: "ok" | "high" | "severe"; today: boolean };
  bpHistory: { at: string; systolic: number | null; diastolic: number | null }[];
  kicks: null | { at: string; count: number | null; today: boolean };
  todayLog: null | { feeling: string | null; symptoms: string[]; bleeding: boolean; flow: string | null };
  danger: null | { at: string; signs: string[]; handled: boolean };
  unreadMessages: number;
  lastMessage: null | { body: string; fromPatient: boolean; createdAt: string };
};

let cache: Home | null = null;
const listeners = new Set<(h: Home) => void>();
export const cachedHome = () => cache;

export function useHome() {
  const [data, setData] = useState<Home | null>(cache);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!cache);
  const reload = useCallback(async () => {
    try { const h = await api<Home>("/api/me"); cache = h; listeners.forEach((l) => l(h)); setError(null); } catch (e) { setError((e as Error).message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { listeners.add(setData); reload(); return () => { listeners.delete(setData); }; }, [reload]);
  return { data, error, loading, reload };
}
