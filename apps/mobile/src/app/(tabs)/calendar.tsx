import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { addMonths, eachDayOfInterval, endOfMonth, getDay, isSameDay, startOfMonth } from "date-fns";
import { fmtDate, FLOW_LABEL } from "@gyne/core";
import { Screen, Row } from "@/components/screen";
import { Glass, GlassPress } from "@/components/glass";
import { T } from "@/components/text";
import { api, d } from "@/lib/api";
import { useHome } from "@/lib/use-home";
import { useTheme } from "@/hooks/use-theme";

const MONTHS = ["كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران", "تموز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "كانون الأول"];
type Log = { date: string; bleeding: boolean; flow: string | null; mood: string | null };

export default function Calendar() {
  const t = useTheme();
  const { data } = useHome();
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const [logs, setLogs] = useState<Log[]>([]);
  useEffect(() => { api<{ logs: Log[] }>("/api/logs?days=400").then((r) => setLogs(r.logs)).catch(() => {}); }, []);
  const days = useMemo(() => eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) }), [month]);
  const lead = getDay(startOfMonth(month));
  const today = new Date();
  const next = d(data?.cycle?.nextPeriod);
  const fw = data?.cycle?.fertileWindow;

  return (
    <Screen>
      <Row>
        <GlassPress onPress={() => setMonth(addMonths(month, -1))} style={s.nav}><T>‹</T></GlassPress>
        <T kind="h1" style={{ textAlign: "center" }}>{MONTHS[month.getMonth()]} {month.getFullYear()}</T>
        <GlassPress onPress={() => setMonth(addMonths(month, 1))} style={s.nav}><T>›</T></GlassPress>
      </Row>
      <Glass>
        <View style={s.grid}>
          {["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"].map((w) => <T key={w} kind="label" style={s.cellHead}>{w}</T>)}
          {Array.from({ length: lead }).map((_, i) => <View key={`e${i}`} style={s.cell} />)}
          {days.map((day) => {
            const log = logs.find((l) => isSameDay(d(l.date)!, day));
            const bleed = log?.bleeding;
            const predicted = next && !bleed && day >= next && day < new Date(next.getTime() + (data?.cycle?.periodLength ?? 5) * 864e5);
            const fertile = fw && day >= d(fw.from)! && day <= d(fw.to)!;
            const isToday = isSameDay(day, today);
            const bg = bleed ? t.rose : predicted ? t.roseSoft : fertile ? t.ok + "33" : "transparent";
            return (
              <View key={day.toISOString()} style={[s.cell, { backgroundColor: bg, borderColor: isToday ? t.lav : "transparent" }]}>
                <T kind="label" color={bleed ? t.white : t.fg} style={{ textAlign: "center" }}>{day.getDate()}</T>
                {log?.mood && <T style={{ fontSize: 9, textAlign: "center" }}>•</T>}
              </View>
            );
          })}
        </View>
        <View style={s.legend}>
          <Legend c={t.rose} l="دورة مسجّلة" /><Legend c={t.roseSoft} l="دورة متوقعة" /><Legend c={t.ok + "66"} l="نافذة الخصوبة" />
        </View>
      </Glass>
      {data?.cycle && (
        <Glass style={{ gap: 4 }}>
          <T kind="title">توقّعاتك</T>
          {next && <T kind="small">الدورة القادمة: {fmtDate(next)}</T>}
          {fw && <T kind="small">نافذة الخصوبة: {fmtDate(d(fw.from)!, { year: false })} إلى {fmtDate(d(fw.to)!, { year: false })}</T>}
          <T kind="small">متوسط الدورة {data.cycle.cycleLength} يوماً، النزف {data.cycle.periodLength} أيام.</T>
        </Glass>
      )}
      <Glass style={{ gap: 6 }}>
        <T kind="title">آخر الأيام المسجّلة</T>
        {logs.slice(-6).reverse().map((l) => <T key={l.date} kind="small">{fmtDate(d(l.date)!, { year: false })}: {l.bleeding ? (l.flow ? FLOW_LABEL[l.flow] : "نزف") : "بلا نزف"}</T>)}
        {logs.length === 0 && <T kind="small">لا تسجيلات بعد.</T>}
      </Glass>
    </Screen>
  );
}
function Legend({ c, l }: { c: string; l: string }) { return <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}><View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c }} /><T kind="small">{l}</T></View>; }
const s = StyleSheet.create({
  nav: { width: 40, height: 40, padding: 0, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cellHead: { width: `${100 / 7}%`, textAlign: "center", marginBottom: 6 },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, borderRadius: 12, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 10 },
});
