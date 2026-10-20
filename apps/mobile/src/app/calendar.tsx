import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { addMonths, eachDayOfInterval, endOfMonth, getDay, isSameDay, startOfMonth } from "date-fns";
import { fmtDate, FLOW_PLAIN, MOODS_SIMPLE, FEELINGS, PAIN_LEVELS, SYMPTOM_LABEL } from "@gyne/core";
import { Screen, Row } from "@/components/screen";
import { Glass, GlassPress } from "@/components/glass";
import { T } from "@/components/text";
import { Icon } from "@/components/icon";
import { api, d } from "@/lib/api";
import { useHome } from "@/lib/use-home";
import { useTheme } from "@/hooks/use-theme";

const MONTHS = ["كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران", "تموز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "كانون الأول"];
type Log = { date: string; bleeding: boolean; flow: string | null; mood: string | null; pain: number | null; symptoms: string | null; note: string | null };

/** Cycle calendar: whole-cell colours, picture legend, labelled arrows, and the day's log in words. */
export default function Calendar() {
  const t = useTheme();
  const router = useRouter();
  const { data } = useHome();
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const [logs, setLogs] = useState<Log[]>([]);
  const [sel, setSel] = useState<Date>(new Date());
  useEffect(() => { api<{ logs: Log[] }>("/api/logs?days=400").then((r) => setLogs(r.logs)).catch(() => {}); }, []);
  const days = useMemo(() => eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) }), [month]);
  const lead = getDay(startOfMonth(month));
  const today = new Date();
  const next = d(data?.cycle?.nextPeriod);
  const fw = data?.cycle?.fertileWindow;
  const log = logs.find((l) => isSameDay(d(l.date)!, sel));
  const words = (l: Log) => [
    l.mood && (MOODS_SIMPLE.find((m) => m.key === l.mood) ?? FEELINGS.find((m) => m.key === l.mood)) ? `${(MOODS_SIMPLE.find((m) => m.key === l.mood) ?? FEELINGS.find((m) => m.key === l.mood))!.emoji} ${(MOODS_SIMPLE.find((m) => m.key === l.mood) ?? FEELINGS.find((m) => m.key === l.mood))!.label}` : null,
    l.pain != null ? `${PAIN_LEVELS.find((p) => p.key === l.pain)?.emoji ?? "🙂"} ${PAIN_LEVELS.find((p) => p.key === l.pain)?.label ?? "ماكو وجع"}` : null,
    l.bleeding ? `🩸 ${l.flow ? FLOW_PLAIN[l.flow].label : "دم"}` : "ماكو دم",
    ...(l.symptoms ? l.symptoms.split(",").map((k) => SYMPTOM_LABEL[k] ?? k) : []),
  ].filter(Boolean).join(" · ");

  return (
    <Screen tabbed={false}>
      <Row><Pressable onPress={() => router.back()} style={[s.nav, { backgroundColor: t.glassStrong, borderColor: t.glassLine }]}><Icon name="back" size={18} color={t.fg} /></Pressable><T kind="h1">تقويمي</T><View style={{ width: 40 }} /></Row>
      <Glass style={{ gap: 10 }}>
        <T kind="title" style={{ textAlign: "center" }}>{MONTHS[month.getMonth()]} {month.getFullYear()}</T>
        <Row>
          <GlassPress onPress={() => setMonth(addMonths(month, -1))} style={s.arrow}><T kind="label">→ الشهر اللي فات</T></GlassPress>
          <GlassPress onPress={() => setMonth(addMonths(month, 1))} style={s.arrow}><T kind="label">الشهر الجاي ←</T></GlassPress>
        </Row>
        <View style={s.grid}>
          {["سبت", "جمعة", "خميس", "أربعاء", "ثلاثاء", "إثنين", "أحد"].reverse().map((w) => <T key={w} kind="label" style={s.cellHead}>{w}</T>)}
          {Array.from({ length: lead }).map((_, i) => <View key={`e${i}`} style={s.blank} />)}
          {days.map((day) => {
            const l = logs.find((x) => isSameDay(d(x.date)!, day));
            const bleed = l?.bleeding;
            const predicted = next && !bleed && day >= next && day < new Date(next.getTime() + (data?.cycle?.periodLength ?? 5) * 864e5);
            const fertile = fw && day >= d(fw.from)! && day <= d(fw.to)!;
            const isToday = isSameDay(day, today), isSel = isSameDay(day, sel);
            const bg = bleed ? t.rose : predicted ? t.roseSoft : fertile ? t.okSoft : t.glass;
            return (
              <Pressable key={day.toISOString()} onPress={() => setSel(day)} style={[s.cell, { backgroundColor: bg, borderColor: isSel ? t.lavDeep : isToday ? t.lav : "transparent" }]}>
                <T kind="label" color={bleed ? t.white : t.fg} style={{ textAlign: "center", fontSize: 14 }}>{day.getDate()}</T>
                {l && !bleed && <View style={[s.dot, { backgroundColor: t.lav }]} />}
              </Pressable>
            );
          })}
        </View>
        <View style={s.legend}><Legend c={t.rose} l="🩸 دورة" /><Legend c={t.roseSoft} l="🩸 دورة متوقعة" /><Legend c={t.okSoft} l="🌱 ممكن يصير حمل" /></View>
      </Glass>
      <Glass style={{ gap: 4 }}>
        <Row><T kind="title">{fmtDate(sel, { weekday: true, year: false })}</T>{isSameDay(sel, today) && <Pressable onPress={() => router.push("/(tabs)/daily")}><T kind="label" color={t.lavDeep}>سجّلي</T></Pressable>}</Row>
        {log ? <><T kind="small">سجّلتي</T><T>{words(log)}</T>{log.note && <T kind="small">«{log.note}»</T>}</> : <T kind="small">ما سجّلتي شي هذا اليوم.</T>}
      </Glass>
    </Screen>
  );
}
function Legend({ c, l }: { c: string; l: string }) { return <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}><View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: c }} /><T kind="small">{l}</T></View>; }
const s = StyleSheet.create({
  nav: { width: 40, height: 40, padding: 0, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  arrow: { paddingVertical: 8, paddingHorizontal: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", direction: "rtl" },
  cellHead: { width: `${100 / 7}%`, textAlign: "center", marginBottom: 6, fontSize: 12 },
  blank: { width: `${100 / 7}%`, aspectRatio: 1 },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, borderRadius: 999, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  dot: { width: 4, height: 4, borderRadius: 2, marginTop: 1 },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "center" },
});
