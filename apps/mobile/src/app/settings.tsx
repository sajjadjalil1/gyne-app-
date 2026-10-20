import { useState } from "react";
import { Pressable, StyleSheet, Switch, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Screen, Row } from "@/components/screen";
import { Glass } from "@/components/glass";
import { Button } from "@/components/button";
import { T } from "@/components/text";
import { Icon } from "@/components/icon";
import { api } from "@/lib/api";
import { useHome } from "@/lib/use-home";
import { ensurePermission, syncReminders } from "@/lib/reminders";
import { useTheme } from "@/hooks/use-theme";
import { Fonts } from "@/constants/theme";

/** Reminders: wake and sleep (the timetable follows), Ramadan, and what the lock screen shows. */
export default function Settings() {
  const t = useTheme();
  const router = useRouter();
  const { data, reload } = useHome();
  const [wake, setWake] = useState(data?.patient.wakeTime ?? "07:00");
  const [sleep, setSleep] = useState(data?.patient.sleepTime ?? "23:00");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  if (!data) return <Screen tabbed={false}><Glass><T>لحظة…</T></Glass></Screen>;
  async function save(patch: Record<string, unknown>) {
    setBusy(true); setMsg(null);
    try { await api("/api/profile", { method: "PATCH", json: patch }); await reload(); const ok = await ensurePermission(); if (ok) { const h = (await api("/api/me")) as typeof data; await syncReminders(h!); setMsg("تم. التذكيرات اتحدثت على موبايلچ."); } else setMsg("تم الحفظ. التنبيهات مقفلة بإعدادات الموبايل، افتحيها حتى توصلچ التذكيرات."); } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  }
  const input = [s.input, { backgroundColor: t.glassStrong, borderColor: t.glassLine, color: t.fg }];
  return (
    <Screen tabbed={false}>
      <Row><Pressable onPress={() => router.back()} style={[s.back, { backgroundColor: t.glassStrong, borderColor: t.glassLine }]}><Icon name="back" size={18} color={t.fg} /></Pressable><T kind="h1">التذكيرات</T><View style={{ width: 40 }} /></Row>
      <Glass style={{ gap: 10 }}>
        <T kind="title">وقتچ</T>
        <T kind="small">نرتّب أوقات الدوا على يومچ: الحديد بعيد عن الچاي، والكالسيوم بعيد عن الحديد.</T>
        <Row><T>أصحى الساعة</T><TextInput value={wake} onChangeText={setWake} placeholder="07:00" keyboardType="numbers-and-punctuation" style={input} /></Row>
        <Row><T>أنام الساعة</T><TextInput value={sleep} onChangeText={setSleep} placeholder="23:00" keyboardType="numbers-and-punctuation" style={input} /></Row>
        <Button title="احفظي" onPress={() => save({ wakeTime: wake, sleepTime: sleep })} busy={busy} disabled={!/^\d{2}:\d{2}$/.test(wake) || !/^\d{2}:\d{2}$/.test(sleep)} />
      </Glass>
      <Glass style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ flex: 1 }}><T kind="title">🌙 وضع رمضان</T><T kind="small">التذكيرات تصير وقت السحور والفطور.</T></View>
        <Switch value={data.patient.ramadanMode} onValueChange={(v) => save({ ramadanMode: v })} trackColor={{ true: t.lav, false: t.lavSoft }} />
      </Glass>
      <Glass style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ flex: 1 }}><T kind="title">🔒 اسم الدوا بالتنبيه</T><T kind="small">مقفل: يطلع «تذكير من عيادتي 💜» بس. مفتوح: يطلع اسم الدوا.</T></View>
        <Switch value={data.patient.detailedNotifications} onValueChange={(v) => save({ detailedNotifications: v })} trackColor={{ true: t.lav, false: t.lavSoft }} />
      </Glass>
      {msg && <Glass><T kind="small" color={t.fg}>{msg}</T></Glass>}
    </Screen>
  );
}
const s = StyleSheet.create({
  back: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  input: { width: 110, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, fontSize: 18, fontFamily: Fonts.semibold, textAlign: "center", writingDirection: "ltr" },
});
