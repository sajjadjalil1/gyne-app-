import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

export type Home = {
  patient: { id: string; name: string; firstName: string };
  today: string;
  pregnancy: null | { id: string; edd: string; ga: { weeks: number; days: number; totalDays: number }; gaLabel: string; trimester: 1 | 2 | 3; daysLeft: number; datingMethod: string; rhNegative: boolean; upcoming: { key: string; title: string; from: string; to: string; kind: string; note?: string }[] };
  cycle: null | { lastPeriodStart?: string; cycleLength: number; periodLength: number; nextPeriod?: string; ovulation?: string; fertileWindow?: { from: string; to: string }; dayOfCycle?: number; daysToNextPeriod?: number; daysToOvulation?: number };
  contraception: null | { id: string; method: string; label: string; brand: string | null; startedAt: string; expiresAt: string | null; reminderAt: string | null };
  nextAppointments: { id: string; type: string; startsAt: string; reason: string | null }[];
  bp: { at: string; systolic: number | null; diastolic: number | null }[];
  kicks: null | { at: string; count: number | null };
  unreadMessages: number;
  lastMessage: null | { body: string; fromPatient: boolean; createdAt: string };
};

export function useHome() {
  const [data, setData] = useState<Home | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    try { setData(await api<Home>("/api/me")); setError(null); } catch (e) { setError((e as Error).message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { reload(); }, [reload]);
  return { data, error, loading, reload };
}
