import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { addDays, differenceInCalendarDays } from "date-fns";
import { fmtDate, PACKS, type PackType } from "@gyne/core";
import { Screen, Row } from "@/components/screen";
import { Glass } from "@/components/glass";
import { Button } from "@/components/button";
import { T } from "@/components/text";
import { Icon } from "@/components/icon";
import { Listen } from "@/components/listen";
import { api, d } from "@/lib/api";
import { useHome } from "@/lib/use-home";
import { useTheme } from "@/hooks/use-theme";

/** Pill mode: a virtual blister, one button for today, and the clinic's own missed-pill steps. */
export default function PillScreen() {
  const t = useTheme();
  const router = useRouter();
  const { data, reload } = useHome();
  const [busy, setBusy] = useState(false);
  const [advice, setAdvice] = useState<{ text: string; fromClinic: boolean } | null>(null);
  const pill = data?.contraception?.pill;
  if (!data || !pill) return <Screen tabbed={false}><Glass><T>ما عندچ حبوب مسجّلة. الدكتورة تسجّلها من العيادة.</T></Glass></Screen>;
  const pack = PACKS[pill.packType as PackType];
  const start = d(pill.cycleStart)!;
  const todayIdx = differenceInCalendarDays(new Date(), start);
  const takenDays = new Set(pill.last7.map((ok, i) => (ok ? differenceInCalendarDays(addDays(new Date(), i - 6), start) : -99)));
  async function taken() { setBusy(true); try { await api("/api/pill", { method: "POST", json: { op: "taken" } }); await reload(); } finally { setBusy(false); } }
  async function missed(count: "one" | "two_plus") { setBusy(true); try { setAdvice(await api<{ text: string; fromClinic: boolean }>("/api/pill", { method: "POST", json: { op: "missed", count } })); } finally { setBusy(false); } }
  return (
    <Screen tabbed={false}>
      <Row><Pressable onPress={() => router.back()} style={[s.back, { backgroundColor: t.glassStrong, borderColor: t.glassLine }]}><Icon name="back" size={18} color={t.fg} /></Pressable><T kind="h1">حبوب منع الحمل</T><Listen text={pill.inFree ? "هذا أسبوع بدون حبوب." : `حبة اليوم رقم ${pill.pillNumber}. كل يوم الساعة ${pill.pillTime}.`} compact /></Row>
      <Glass style={{ gap: 10 }}>
        <T kind="small">{pack.label} · بدأ {fmtDate(d(pill.packStartedAt)!, { year: false })}{data.contraception?.brand ? ` · ${data.contraception.brand}` : ""}</T>
        <T kind="h1" style={{ fontSize: 26 }}>{pill.inFree ? "أسبوع بدون حبوب" : `حبة اليوم: رقم ${pill.pillNumber}`}</T>
        <T kind="small">كل يوم الساعة {pill.pillTime}{pill.packType === "POP" ? " · لازم بنفس الساعة (فرق 3 ساعات بالكثير)" : ""}</T>
        <View style={s.blister}>
          {Array.from({ length: pill.activeCount }, (_, i) => {
            const today = i === todayIdx, known = i < todayIdx && i >= todayIdx - 6, ok = takenDays.has(i) || (today && pill.takenToday);
            return <View key={i} style={[s.cell, { backgroundColor: ok ? t.lav : today ? t.roseSoft : known ? t.critSoft : t.glassStrong, borderColor: today ? t.lav : t.glassLine }]}><T kind="label" color={ok ? t.white : t.fg} style={{ textAlign: "center", fontSize: 12 }}>{ok ? "✓" : i + 1}</T></View>;
          })}
        </View>
        {pill.freeFrom && pill.freeTo && <T kind="small">أسبوع بدون حبوب: {fmtDate(d(pill.freeFrom)!, { year: false })} لـ {fmtDate(d(pill.freeTo)!, { year: false })}</T>}
        <T kind="small">الباكيت الجاي {fmtDate(d(pill.nextPackAt)!, { year: false })}</T>
        {!pill.inFree && <Button title={pill.takenToday ? "✓ أخذت حبة اليوم" : "أخذت حبة اليوم ✓"} big onPress={taken} busy={busy} disabled={pill.takenToday} />}
      </Glass>
      <Glass style={{ gap: 8 }}>
        <T kind="title">نسيتي حبة؟</T>
        <T kind="small">اختاري، ونگولچ شتسوين حسب تعليمات الدكتورة</T>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Button title="نسيت وحدة" ghost onPress={() => missed("one")} busy={busy} style={{ flex: 1 }} />
          <Button title="نسيت ثنتين أو أكثر" ghost onPress={() => missed("two_plus")} busy={busy} style={{ flex: 1 }} />
        </View>
        {advice && (
          <View style={[s.advice, { backgroundColor: t.warnSoft, borderColor: t.warn }]}>
            <Row><T kind="label">{advice.fromClinic ? "تعليمات الدكتورة" : "راسلي العيادة"}</T><Listen text={advice.text} compact /></Row>
            <T color={t.fg}>{advice.text}</T>
            <T kind="small">وصل العيادة إنچ نسيتي، إذا تحتاجين شي زيادة راح يراسلونچ.</T>
          </View>
        )}
      </Glass>
      <Glass style={{ flexDirection: "row", gap: 8, alignItems: "center" }}><Icon name="lock" size={18} color={t.muted} /><T kind="small" style={{ flex: 1 }}>التنبيه يطلع «تذكير من عيادتي 💜» بس، محد يعرف شنو الدوا.</T></Glass>
    </Screen>
  );
}
const s = StyleSheet.create({
  back: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  blister: { flexDirection: "row", flexWrap: "wrap", gap: 6, direction: "rtl" },
  cell: { width: "12.5%", aspectRatio: 1, borderRadius: 999, borderWidth: 1.5, alignItems: "center", justifyContent: "center", flexGrow: 0, minWidth: 34 },
  advice: { borderRadius: 16, borderWidth: 1, padding: 12, gap: 6 },
});
