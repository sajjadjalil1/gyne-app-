import { useEffect, useMemo, useState } from "react";
import { Linking, Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { contractionSummary, fmtClock, fmtTime, labourStatus, LABOUR_ALWAYS_GO, type Contraction } from "@gyne/core";
import { Screen, Row } from "@/components/screen";
import { Glass } from "@/components/glass";
import { Button } from "@/components/button";
import { T } from "@/components/text";
import { Icon } from "@/components/icon";
import { Listen } from "@/components/listen";
import { api } from "@/lib/api";
import { useHome } from "@/lib/use-home";
import { loadContractions, saveContractions } from "@/lib/contractions-store";
import { useTheme } from "@/hooks/use-theme";

/**
 * «مؤقت الطلق»: one big button per contraction (press when it starts, press when it ends). The app works out the
 * gap and the length and says, in plain words, whether to stay home, get ready, or go now (5-1-1; earlier before
 * 37 weeks or after a previous birth). Waters, bleeding or less movement always open the emergency screen.
 */
export default function Contractions() {
  const t = useTheme();
  const router = useRouter();
  const { data } = useHome();
  const [list, setList] = useState<Contraction[]>([]);
  const [now, setNow] = useState(Date.now());
  const [sent, setSent] = useState<"idle" | "busy" | "done" | "fail">("idle");
  useEffect(() => { loadContractions().then(setList); }, []);
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);

  const running = list.length > 0 && list[list.length - 1].end == null ? list[list.length - 1] : null;
  const lastDone = [...list].reverse().find((c) => c.end != null) ?? null;
  const ga = data?.pregnancy?.ga.weeks ?? null;
  const st = useMemo(() => labourStatus(list, now, { gaWeeks: ga, hadBabyBefore: (data?.patient.para ?? 0) > 0 }), [list, now, ga, data?.patient.para]);
  const phone = data?.clinic.phone;

  function update(next: Contraction[]) { setList(next); saveContractions(next); setSent("idle"); }
  function tap() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const at = Date.now();
    if (running) update(list.map((c) => (c === running ? { ...c, end: at } : c)));
    else update([...list, { start: at, end: null }]);
  }
  function undo() { update(list.slice(0, -1)); }
  function reset() { update([]); }
  async function sendToClinic() {
    setSent("busy");
    try { await api("/api/messages", { method: "POST", json: { body: contractionSummary(st) } }); setSent("done"); } catch { setSent("fail"); }
  }

  const tone = st.level === "go" ? { bg: t.critSoft, line: t.crit, fg: t.crit } : st.level === "soon" ? { bg: t.warnSoft, line: t.warn, fg: t.fg } : { bg: t.glassStrong, line: t.glassLine, fg: t.fg };
  const done = list.filter((c) => c.end != null).slice(-8).reverse();

  return (
    <Screen tabbed={false}>
      <Row>
        <Pressable onPress={() => router.back()} style={[s.back, { backgroundColor: t.glassStrong, borderColor: t.glassLine }]} accessibilityLabel="رجوع"><Icon name="back" size={18} color={t.fg} /></Pressable>
        <T kind="h1">مؤقت الطلق</T>
        <Listen text={`${st.headline}. ${st.detail}`} compact />
      </Row>

      <View style={{ alignItems: "center", gap: 10, paddingVertical: 6 }}>
        <Pressable onPress={tap} accessibilityRole="button" accessibilityLabel={running ? "خلصت الطلقة" : "بدأت الطلقة"}
          style={({ pressed }) => [s.big, { backgroundColor: running ? t.crit : t.lav, borderColor: running ? t.roseSoft : t.lavSoft, transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
          <T kind="title" color={t.white} style={{ textAlign: "center", fontSize: 22, lineHeight: 30 }}>{running ? "خلصت الطلقة" : "بدأت الطلقة"}</T>
          {running ? <T kind="big" color={t.white}>{fmtClock(now - running.start)}</T> : <T kind="small" color="rgba(255,255,255,0.9)" style={{ textAlign: "center" }}>اضغطي أول ما تبدي</T>}
        </Pressable>
        {!running && lastDone && <T kind="label">من آخر طلقة: <T kind="label" color={t.fg}>{fmtClock(now - (lastDone.end as number))}</T></T>}
      </View>

      <Glass style={{ gap: 8, backgroundColor: tone.bg, borderColor: tone.line, borderWidth: st.level === "go" ? 1.5 : 1 }}>
        <T kind="title" color={tone.fg} style={{ fontSize: 19 }}>{st.headline}</T>
        <T>{st.detail}</T>
        {st.level === "go" && (
          <View style={{ gap: 8, marginTop: 4 }}>
            <Button title="روحي للطوارئ" icon="hospital" danger big onPress={() => (data?.clinic.erMapsUrl ? Linking.openURL(data.clinic.erMapsUrl) : router.push("/emergency"))} />
            {phone && <Button title="اتصلي بالعيادة" icon="phone" ghost onPress={() => Linking.openURL(`tel:${phone}`)} />}
            {data?.clinic.erHospital && <T kind="small" style={{ textAlign: "center" }}>أقرب مستشفى ولادة: {data.clinic.erHospital}</T>}
          </View>
        )}
      </Glass>

      {st.avgIntervalMin != null && (
        <View style={s.stats}>
          <Stat label="الفرق بين الطلقات" value={`${st.avgIntervalMin}`} unit="دقيقة" />
          <Stat label="طول الطلقة" value={`${st.avgDurationSec ?? "-"}`} unit="ثانية" />
          <Stat label="بآخر ساعة" value={`${st.countLastHour}`} unit="طلقات" />
        </View>
      )}

      <Glass style={{ gap: 6, borderColor: t.rose }}>
        <T kind="title" color={t.crit}>روحي هسه مهما گال المؤقت إذا:</T>
        {LABOUR_ALWAYS_GO.map((x) => (
          <Pressable key={x.key} onPress={() => router.push({ pathname: "/emergency", params: { signs: x.key } })} style={s.signRow} accessibilityRole="button">
            <View style={[s.dot, { backgroundColor: t.crit }]} /><T style={{ flex: 1 }}>{x.label}</T><Icon name="next" size={16} color={t.crit} />
          </Pressable>
        ))}
      </Glass>

      {done.length > 0 && (
        <Glass style={{ gap: 4 }}>
          <T kind="title">آخر الطلقات</T>
          <View style={[s.tr, { borderColor: t.glassLine }]}><T kind="label" style={s.c}>الوقت</T><T kind="label" style={s.c}>الطول</T><T kind="label" style={s.c}>الفرق</T></View>
          {done.map((c) => {
            const all = list.filter((x) => x.end != null);
            const i = all.indexOf(c);
            const gap = i > 0 ? c.start - all[i - 1].start : null;
            return (
              <View key={c.start} style={[s.tr, { borderColor: t.glassLine }]}>
                <T style={s.c}>{fmtTime(new Date(c.start))}</T>
                <T style={s.c}>{fmtClock((c.end as number) - c.start)}</T>
                <T style={s.c}>{gap == null ? "-" : fmtClock(gap)}</T>
              </View>
            );
          })}
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
            <Button title="امسحي آخر وحدة" ghost onPress={undo} style={{ flex: 1 }} />
            <Button title="ابدي من جديد" ghost onPress={reset} style={{ flex: 1 }} />
          </View>
        </Glass>
      )}

      {st.countLastHour > 0 && (
        <Glass style={{ gap: 8 }}>
          <T kind="small">تگدرين تدزين هالأرقام للعيادة برسالة.</T>
          <Button title={sent === "done" ? "✓ وصلت للعيادة" : "دزي الأرقام للعيادة"} icon={sent === "done" ? undefined : "send"} busy={sent === "busy"} disabled={sent === "done"} onPress={sendToClinic} />
          {sent === "fail" && <T kind="small" color={t.crit}>ما وصلت. تأكدي من الإنترنت، أو اتصلي بالعيادة.</T>}
        </Glass>
      )}
      <T kind="small" style={{ textAlign: "center" }}>المؤقت يشتغل بدون إنترنت، والأرقام تبقى بس على تلفونچ.</T>
    </Screen>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  const t = useTheme();
  return (
    <Glass style={{ flex: 1, alignItems: "center", gap: 2, padding: 10 }}>
      <T kind="num" color={t.lavDeep}>{value}</T>
      <T kind="small" style={{ textAlign: "center" }}>{unit}</T>
      <T kind="label" style={{ textAlign: "center", fontSize: 12 }}>{label}</T>
    </Glass>
  );
}

const s = StyleSheet.create({
  back: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  big: { width: 220, height: 220, borderRadius: 110, alignItems: "center", justifyContent: "center", gap: 4, borderWidth: 6, shadowColor: "#6a50a0", shadowOpacity: 0.25, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  stats: { flexDirection: "row", gap: 8 },
  signRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  tr: { flexDirection: "row", paddingVertical: 6, borderBottomWidth: 1 },
  c: { flex: 1, textAlign: "center" },
});
