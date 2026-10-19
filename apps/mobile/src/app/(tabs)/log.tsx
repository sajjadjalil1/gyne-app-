import { useEffect, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { format } from "date-fns";
import { FLOW_LABEL, MOODS, SYMPTOMS } from "@gyne/core";
import { Screen, Row } from "@/components/screen";
import { Glass } from "@/components/glass";
import { Chip, ChipRow } from "@/components/chip";
import { Button } from "@/components/button";
import { T } from "@/components/text";
import { api } from "@/lib/api";
import { useTheme } from "@/hooks/use-theme";
import { Fonts } from "@/constants/theme";

type Tab = "cycle" | "bp" | "kicks";

export default function Log() {
  const t = useTheme();
  const params = useLocalSearchParams<{ mood?: string; tab?: Tab }>();
  const [tab, setTab] = useState<Tab>(params.tab ?? "cycle");
  const [flow, setFlow] = useState<string | null>(null);
  const [mood, setMood] = useState<string | null>(params.mood ?? null);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [pain, setPain] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [sys, setSys] = useState(""); const [dia, setDia] = useState(""); const [kicks, setKicks] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => { if (params.mood) setMood(params.mood); if (params.tab) setTab(params.tab); }, [params.mood, params.tab]);

  async function saveCycle() {
    setBusy(true); setMsg(null);
    try {
      await api("/api/logs", { method: "PUT", json: { date: format(new Date(), "yyyy-MM-dd"), bleeding: !!flow, flow, mood, symptoms, pain, note: note || null } });
      setMsg("حُفظ. طبيبك يرى هذا في ملفك.");
    } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  }
  async function saveBp() {
    setBusy(true); setMsg(null);
    try {
      await api("/api/readings", { method: "POST", json: { kind: "BP", systolic: Number(sys), diastolic: Number(dia) } });
      setMsg(Number(sys) >= 140 || Number(dia) >= 90 ? "حُفظت. القراءة مرتفعة، العيادة استلمتها وستتواصل معك." : "حُفظت القراءة.");
      setSys(""); setDia("");
    } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  }
  async function saveKicks() {
    setBusy(true); setMsg(null);
    try {
      await api("/api/readings", { method: "POST", json: { kind: "KICKS", value: Number(kicks) } });
      setMsg(Number(kicks) < 10 ? "حُفظ. أقل من 10 حركات: استلقي على جانبك الأيسر وأعيدي العدّ، وإذا بقيت قليلة اتصلي بالعيادة." : "حُفظ. حركات الجنين جيدة.");
      setKicks("");
    } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  }

  const input = [s.input, { backgroundColor: t.glassStrong, borderColor: t.glassLine, color: t.fg }];
  return (
    <Screen>
      <T kind="h1">تسجيل اليوم</T>
      <ChipRow>
        <Chip label="الدورة والمزاج" on={tab === "cycle"} onPress={() => setTab("cycle")} />
        <Chip label="ضغط الدم" on={tab === "bp"} onPress={() => setTab("bp")} />
        <Chip label="حركات الجنين" on={tab === "kicks"} onPress={() => setTab("kicks")} />
      </ChipRow>

      {tab === "cycle" && (
        <>
          <Glass style={{ gap: 10 }}>
            <T kind="title">تدفّق الدورة</T>
            <ChipRow>{(["SPOTTING", "LIGHT", "MEDIUM", "HEAVY"] as const).map((f) => <Chip key={f} emoji="💧" label={FLOW_LABEL[f]} on={flow === f} onPress={() => setFlow(flow === f ? null : f)} />)}</ChipRow>
          </Glass>
          <Glass style={{ gap: 10 }}>
            <T kind="title">المزاج</T>
            <ChipRow>{MOODS.map((m) => <Chip key={m.key} emoji={m.emoji} label={m.label} on={mood === m.key} onPress={() => setMood(mood === m.key ? null : m.key)} />)}</ChipRow>
          </Glass>
          <Glass style={{ gap: 10 }}>
            <T kind="title">الأعراض</T>
            <ChipRow>{SYMPTOMS.map((x) => <Chip key={x.key} label={x.label} on={symptoms.includes(x.key)} onPress={() => setSymptoms(symptoms.includes(x.key) ? symptoms.filter((k) => k !== x.key) : [...symptoms, x.key])} />)}</ChipRow>
            <T kind="title" style={{ marginTop: 4 }}>الألم</T>
            <ChipRow>{[0, 2, 4, 6, 8, 10].map((n) => <Chip key={n} label={n === 0 ? "لا ألم" : String(n)} on={pain === n} onPress={() => setPain(n)} />)}</ChipRow>
            <TextInput value={note} onChangeText={setNote} placeholder="ملاحظة لطبيبك (اختياري)" placeholderTextColor={t.faint} style={input} multiline />
          </Glass>
          <Button title="حفظ اليوم" onPress={saveCycle} busy={busy} />
        </>
      )}

      {tab === "bp" && (
        <Glass style={{ gap: 10 }}>
          <T kind="title">قراءة ضغط الدم</T>
          <T kind="small">اجلسي خمس دقائق قبل القياس، والذراع على مستوى القلب.</T>
          <Row>
            <View style={{ flex: 1 }}><T kind="label">الانقباضي</T><TextInput value={sys} onChangeText={setSys} keyboardType="number-pad" placeholder="120" placeholderTextColor={t.faint} style={input} /></View>
            <View style={{ flex: 1 }}><T kind="label">الانبساطي</T><TextInput value={dia} onChangeText={setDia} keyboardType="number-pad" placeholder="80" placeholderTextColor={t.faint} style={input} /></View>
          </Row>
          <Button title="حفظ القراءة" onPress={saveBp} busy={busy} disabled={!sys || !dia} />
        </Glass>
      )}

      {tab === "kicks" && (
        <Glass style={{ gap: 10 }}>
          <T kind="title">عدّ حركات الجنين</T>
          <T kind="small">بعد وجبة، استلقي على جانبك وعدّي الحركات حتى تصلي إلى 10. سجّلي العدد خلال ساعتين.</T>
          <TextInput value={kicks} onChangeText={setKicks} keyboardType="number-pad" placeholder="10" placeholderTextColor={t.faint} style={input} />
          <Button title="حفظ العدّ" onPress={saveKicks} busy={busy} disabled={!kicks} />
        </Glass>
      )}

      {msg && <Glass><T>{msg}</T></Glass>}
    </Screen>
  );
}
const s = StyleSheet.create({ input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, fontFamily: Fonts.regular, textAlign: "right" } });
