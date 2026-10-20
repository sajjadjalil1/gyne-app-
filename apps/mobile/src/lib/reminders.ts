import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { addDays, addMinutes, set, startOfDay, subHours } from "date-fns";
import type { Home } from "./use-home";
import { api } from "./api";

/**
 * Local reminders, scheduled on the phone so they work offline. Lock-screen text
 * stays "تذكير من عيادتي 💜" unless the patient opted into details. Three actions
 * on the notification itself: taken / snooze 30 min / skip.
 */
export const DOSE_CATEGORY = "dose";
const native = Platform.OS !== "web";

export async function setupNotifications() {
  if (!native) return;
  Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }) });
  await Notifications.setNotificationCategoryAsync(DOSE_CATEGORY, [
    { identifier: "taken", buttonTitle: "✓ أخذتها", options: { opensAppToForeground: false } },
    { identifier: "snooze", buttonTitle: "⏰ بعد نص ساعة", options: { opensAppToForeground: false } },
    { identifier: "skip", buttonTitle: "ما راح آخذها", options: { opensAppToForeground: false, isDestructive: true } },
  ]);
  if (Platform.OS === "android") await Notifications.setNotificationChannelAsync("reminders", { name: "تذكيرات عيادتي", importance: Notifications.AndroidImportance.HIGH, vibrationPattern: [0, 250, 250, 250] });
}

export async function ensurePermission(): Promise<boolean> {
  if (!native) return false;
  const cur = await Notifications.getPermissionsAsync();
  if (cur.granted) return true;
  const r = await Notifications.requestPermissionsAsync();
  return r.granted;
}

type DoseData = { kind: "dose"; prescriptionId: string; dueAt: string } | { kind: "pill"; dueAt: string } | { kind: "appt"; id: string };

async function schedule(at: Date, title: string, body: string, data: DoseData, category?: string) {
  if (at <= new Date()) return;
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data, categoryIdentifier: category, sound: true, interruptionLevel: "timeSensitive" },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: "reminders" },
  });
}

/** Rebuild the next two days of reminders from the server's view of today. One follow-up per dose, never more. */
export async function syncReminders(h: Home) {
  if (!native) return;
  if (!(await Notifications.getPermissionsAsync()).granted) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  const detailed = h.patient.detailedNotifications;
  const title = "تذكير من عيادتي 💜";
  for (const m of h.meds) {
    for (const d of m.doses) {
      if (d.status) continue;
      const due = new Date(d.dueAt);
      const body = detailed ? `${m.emoji} ${m.label} · ${m.dose}` : "وقت الدوا. اضغطي للتفاصيل.";
      await schedule(due, title, body, { kind: "dose", prescriptionId: m.id, dueAt: due.toISOString() }, DOSE_CATEGORY);
      await schedule(addMinutes(due, 45), title, detailed ? `ما نسيتي ${m.label}؟` : "تذكير ثاني وأخير لليوم.", { kind: "dose", prescriptionId: m.id, dueAt: due.toISOString() }, DOSE_CATEGORY);
    }
    // tomorrow, same clock times
    for (const d of m.doses) {
      const due = addDays(new Date(d.dueAt), 1);
      await schedule(due, title, detailed ? `${m.emoji} ${m.label} · ${m.dose}` : "وقت الدوا. اضغطي للتفاصيل.", { kind: "dose", prescriptionId: m.id, dueAt: due.toISOString() }, DOSE_CATEGORY);
    }
  }
  const pill = h.contraception?.pill;
  if (pill && !pill.inFree) {
    const [hh, mm] = pill.pillTime.split(":").map(Number);
    for (let i = 0; i < 2; i++) {
      const at = set(addDays(startOfDay(new Date()), i), { hours: hh, minutes: mm });
      if (i === 0 && pill.takenToday) continue;
      await schedule(at, title, detailed ? "حبة اليوم" : "وقتها. اضغطي للتفاصيل.", { kind: "pill", dueAt: at.toISOString() }, DOSE_CATEGORY);
    }
  }
  const appt = h.nextAppointments[0];
  if (appt) {
    const at = set(subHours(new Date(appt.startsAt), 24), { hours: 18, minutes: 0 });
    await schedule(at, "موعدچ باچر 💜", appt.prep ? `لا تنسين: ${appt.prep}` : "موعد بالعيادة باچر. اضغطي للتفاصيل.", { kind: "appt", id: appt.id });
  }
}

/** A tap on a notification action logs the dose without opening the app. */
export function listenForActions(onChange: () => void) {
  if (!native) return () => {};
  const sub = Notifications.addNotificationResponseReceivedListener(async (res) => {
    const data = res.notification.request.content.data as DoseData | undefined;
    const action = res.actionIdentifier;
    if (!data) return;
    try {
      if (data.kind === "dose" && (action === "taken" || action === "skip")) await api("/api/meds/dose", { method: "POST", json: { prescriptionId: data.prescriptionId, dueAt: data.dueAt, status: action === "taken" ? "TAKEN" : "SKIPPED", reason: action === "skip" ? "من التنبيه" : undefined } });
      else if (data.kind === "dose" && action === "snooze") await schedule(addMinutes(new Date(), 30), "تذكير من عيادتي 💜", "مرّ نص ساعة.", data, DOSE_CATEGORY);
      else if (data.kind === "pill" && action === "taken") await api("/api/pill", { method: "POST", json: { op: "taken" } });
      onChange();
    } catch {}
  });
  return () => sub.remove();
}
