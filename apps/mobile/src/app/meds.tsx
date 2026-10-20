import { useState } from "react";
import { Pressable, StyleSheet, Switch, View } from "react-native";
import { useRouter } from "expo-router";
import { fmtTime, TIMING_LABEL, type TimingRule } from "@gyne/core";
import { Screen, Row } from "@/components/screen";
import { Glass } from "@/components/glass";
import { T } from "@/components/text";
import { Icon } from "@/components/icon";
import { Listen } from "@/components/listen";
import { Status } from "@/components/tiles";
import { api, d } from "@/lib/api";
import { useHome, type Med } from "@/lib/use-home";
import { syncReminders } from "@/lib/reminders";
import { useTheme } from "@/hooks/use-theme";

/** «أدويتي»: today's doses with taken / snooze / skip, a gentle weekly ring, and the clinic's own rules. */
export default function Meds() {
  const t = useTheme();
  const router = useRouter();
  const { data, reload } = useHome();
  const [busy, setBusy] = useState<string | null>(null);
  if (!data) return <Screen tabbed={false}><Glass><T>لحظة…</T></Glass></Screen>;
  async function log(m: Med, dueAt: string, status: "TAKEN" | "SKIPPED", reason?: string) {
    setBusy(m.id + dueAt);
    try { await api("/api/meds/dose", { method: "POST", json: { prescriptionId: m.id, dueAt, status, reason } }); await reload(); } finally { setBusy(null); }
  }
  async function ramadan(v: boolean) { await api("/api/profile", { method: "PATCH", json: { ramadanMode: v } }); const h = await reload(); void h; }
  const h = data;
  return (
    <Screen tabbed={false}>
      <Row><Pressable onPress={() => router.back()} style={[s.back, { backgroundColor: t.glassStrong, borderColor: t.glassLine }]}><Icon name="back" size={18} color={t.fg} /></Pressable><T kind="h1">أدويتي</T><Listen text="أدويتي. اضغطي أخذتها بعد ما تاخذين الدوا." compact /></Row>

      <View style={[s.lock, { backgroundColor: "#2a2440" }]}>
        <Row><T kind="small" color="#cfc6e6">عيادتي · هسه</T><T kind="small" color="#cfc6e6">قفل الشاشة</T></Row>
        <T color="#fff">تذكير من عيادتي 💜</T>
        <View style={{ flexDirection: "row", gap: 6, marginTop: 4 }}>{["✓ أخذتها", "⏰ بعد نص ساعة", "ما راح آخذها"].map((x) => <View key={x} style={s.lockBtn}><T kind="label" color="#fff" style={{ fontSize: 11 }}>{x}</T></View>)}</View>
      </View>

      <Glass style={{ gap: 6 }}>
        <Row><T kind="title">{h.weekCovered} من {h.weekScheduled || 7} أيام هالأسبوع</T><View style={{ flexDirection: "row", gap: 4 }}>{h.weekDots.map((x, i) => <View key={i} style={[s.dot, { backgroundColor: x === "full" ? t.lav : x === "part" ? t.warn : x === "none" ? t.critSoft : t.lavSoft }]} />)}</View></Row>
        <T kind="small">{h.weekCovered >= Math.max(1, h.weekScheduled) ? "عاشت إيدچ 💜 كل يوم يفرق" : "لا بأس، نكمل اليوم 💜"}</T>
      </Glass>

      {h.meds.map((m) => (
        <Glass key={m.id} style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={[s.ic, { backgroundColor: t.lavSoft }]}><T style={{ fontSize: 24 }}>{m.emoji}</T></View>
            <View style={{ flex: 1 }}>
              <T kind="title">{m.label}{m.source === "SELF" && <T kind="small"> · أضفتيه بنفسچ</T>}</T>
              <T kind="small">{m.dose} · {m.doses.map((x) => fmtTime(d(x.dueAt)!)).join(" و ")}{m.timing !== "ANY" ? ` · ${TIMING_LABEL[m.timing as TimingRule]}` : ""}{m.note ? ` · ${m.note}` : ""}{m.stopNote ? ` · ${m.stopNote}` : ""}</T>
            </View>
          </View>
          {m.doses.map((x) => {
            const due = d(x.dueAt)!;
            const now = new Date();
            const isNow = !x.status && due <= now;
            return (
              <View key={x.dueAt} style={[s.dose, { borderColor: t.glassLine }]}>
                <View style={{ flex: 1 }}>
                  {x.status === "TAKEN" || x.status === "LATE" ? <Status text={`✓ ${x.loggedAt ? fmtTime(d(x.loggedAt)!) : "أخذتيها"}`} /> : x.status === "SKIPPED" ? <Status text="ما أخذتيها" tone="later" /> : isNow ? <Status text="هسه" tone="now" /> : <Status text={fmtTime(due)} tone="later" />}
                </View>
                {!x.status && (
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    <Pressable disabled={busy === m.id + x.dueAt} onPress={() => log(m, x.dueAt, "TAKEN")} style={[s.act, { backgroundColor: t.lav }]}><T kind="label" color={t.white}>✓ أخذتها</T></Pressable>
                    <Pressable disabled={busy === m.id + x.dueAt} onPress={() => syncReminders(h)} style={[s.act, { backgroundColor: t.glassStrong, borderWidth: 1, borderColor: t.glassLine }]}><T kind="label">⏰ بعد نص ساعة</T></Pressable>
                    <Pressable disabled={busy === m.id + x.dueAt} onPress={() => log(m, x.dueAt, "SKIPPED", "ما آخذها")} style={[s.act, { backgroundColor: t.glassStrong, borderWidth: 1, borderColor: t.glassLine }]}><T kind="label">ما آخذها</T></Pressable>
                  </View>
                )}
                {(x.status === "TAKEN" || x.status === "LATE") && <Pressable onPress={() => log(m, x.dueAt, "SKIPPED", "غلط")}><T kind="small" color={t.faint}>غلط؟</T></Pressable>}
              </View>
            );
          })}
        </Glass>
      ))}
      {h.meds.length === 0 && <Glass><T>ماكو أدوية موصوفة هسه. الدكتورة تضيفها من العيادة وتظهر هنا ويا التذكيرات.</T></Glass>}
      {h.finishedMeds.map((f) => <Glass key={f.label} style={{ backgroundColor: t.okSoft, borderColor: t.ok }}><T kind="small" color={t.fg}>✓ {f.label} خلص بوقته (الأسبوع {f.stopWeek})</T></Glass>)}
      <Glass style={{ gap: 4 }}><T kind="small">الجرعة من الدكتورة. إذا تريدين تغيّرين شي، راسلي العيادة.</T></Glass>

      <Glass style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={[s.ic, { backgroundColor: t.lavSoft }]}><Icon name="moon" size={22} color={t.lavDeep} /></View>
        <View style={{ flex: 1 }}><T kind="title">وضع رمضان</T><T kind="small">التذكيرات تصير وقت السحور والفطور. {h.clinic.fastingAdvice ? "اسألي الدكتورة قبل الصيام." : ""}</T></View>
        <Switch value={h.patient.ramadanMode} onValueChange={ramadan} trackColor={{ true: t.lav, false: t.lavSoft }} />
      </Glass>
      {h.patient.ramadanMode && h.clinic.fastingAdvice && <Glass style={{ backgroundColor: t.warnSoft, borderColor: t.warn }}><Row><T kind="small" color={t.fg} style={{ flex: 1 }}>{h.clinic.fastingAdvice}</T><Listen text={h.clinic.fastingAdvice} compact /></Row></Glass>}
    </Screen>
  );
}
const s = StyleSheet.create({
  back: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  lock: { borderRadius: 18, padding: 12, gap: 4 },
  lockBtn: { paddingVertical: 5, paddingHorizontal: 9, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.18)" },
  dot: { width: 10, height: 10, borderRadius: 5 },
  ic: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  dose: { flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 8, borderTopWidth: 1, flexWrap: "wrap" },
  act: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 999 },
});
