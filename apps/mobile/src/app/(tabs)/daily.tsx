import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { format } from "date-fns";
import { BP_TEXT, bpLevel, FEELINGS, FLOW_PLAIN, MOODS_SIMPLE, PAIN_LEVELS, SYMPTOMS_CYCLE, SYMPTOMS_PREGNANCY } from "@gyne/core";
import { Screen, Row } from "@/components/screen";
import { Glass } from "@/components/glass";
import { T } from "@/components/text";
import { Listen } from "@/components/listen";
import { Steps, Tile, TileGrid, tileWidth } from "@/components/tiles";
import { DoneBar } from "@/components/done-bar";
import { Button } from "@/components/button";
import { api } from "@/lib/api";
import { useHome } from "@/lib/use-home";
import { useTheme } from "@/hooks/use-theme";
import { Fonts } from "@/constants/theme";

type Step = "period" | "flow" | "feel" | "symptoms" | "bp" | "kicks" | "done";

/**
 * Guided daily check-in: one question per screen, picture buttons, and a
 * "خلصت" button that is always visible above the tab bar. Danger signs go first
 * and jump straight to the help screen.
 */
export default function Daily() {
  const t = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ step?: string }>();
  const { data, reload } = useHome();
  const pregnant = data?.mode === "pregnancy";
  const weeks = data?.pregnancy?.ga.weeks ?? 0;

  const [period, setPeriod] = useState<boolean | null>(null);
  const [flow, setFlow] = useState<string | null>(null);
  const [feel, setFeel] = useState<string | null>(null);
  const [mood, setMood] = useState<string | null>(null);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [pain, setPain] = useState<number | null>(null);
  const [sys, setSys] = useState(""); const [dia, setDia] = useState(""); const [pul, setPul] = useState("");
  const [bpSymptom, setBpSymptom] = useState<boolean | null>(null);
  const [kicks, setKicks] = useState(0); const [kickStart, setKickStart] = useState<number | null>(null); const [tick, setTick] = useState(0);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const steps = useMemo<Step[]>(() => {
    if (!data) return ["feel"];
    if (pregnant) { const s: Step[] = ["feel"]; if (feel && feel !== "good") s.push("symptoms"); s.push("bp"); if (weeks >= 28) s.push("kicks"); return s; }
    const s: Step[] = ["period"]; if (period) s.push("flow"); s.push("feel", "symptoms"); return s;
  }, [data, pregnant, feel, weeks, period]);
  const [i, setI] = useState(0);
  const step: Step = steps[Math.min(i, steps.length - 1)] ?? "done";
  useEffect(() => { if (params.step && steps.includes(params.step as Step)) setI(steps.indexOf(params.step as Step)); }, [params.step, steps]);
  useEffect(() => { if (kickStart == null || kicks >= 10) return; const id = setInterval(() => setTick((x) => x + 1), 1000); return () => clearInterval(id); }, [kickStart, kicks]);

  const list = pregnant ? SYMPTOMS_PREGNANCY : SYMPTOMS_CYCLE;
  const toggle = (k: string) => setSymptoms((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));
  const sysN = Number(sys), diaN = Number(dia);
  const bpOk = sys.length >= 2 && dia.length >= 2 && sysN >= 60 && sysN <= 260 && diaN >= 30 && diaN <= 160;
  const level = bpOk ? bpLevel(sysN, diaN) : null;
  const dangerPicked = pregnant ? symptoms.filter((k) => list.find((x) => x.key === k)?.danger) : [];
  const canNext = step === "period" ? period != null : step === "flow" ? !!flow : step === "feel" ? !!feel : step === "bp" ? (bpOk ? (level === "ok" || bpSymptom != null) : true) : true;
  const last = i >= steps.length - 1;

  async function saveBp() { if (!bpOk) return; await api("/api/readings", { method: "POST", json: { kind: "BP", systolic: sysN, diastolic: diaN, note: pul ? `نبض ${pul}` : undefined } }); }

  async function next() {
    setErr(null);
    try {
      if (step === "bp" && bpOk) { setBusy(true); await saveBp(); }
      if (!last) { setI(i + 1); return; }
      setBusy(true);
      const painOrNull = pain;
      const r = await api<{ dangers: string[] }>("/api/logs", { method: "PUT", json: { date: format(new Date(), "yyyy-MM-dd"), bleeding: pregnant ? undefined : !!period, flow: pregnant ? null : (period ? flow : null), mood: mood ?? feel, symptoms, pain: painOrNull, note: note || null } });
      if (step === "kicks" && kicks > 0) await api("/api/readings", { method: "POST", json: { kind: "KICKS", value: kicks } });
      await reload();
      const signs = [...new Set([...r.dangers, ...(level && level !== "ok" && bpSymptom ? ["headache"] : []), ...(level === "severe" ? ["bp"] : [])])];
      if (signs.length) { router.replace({ pathname: "/emergency", params: { signs: signs.join(","), from: "checkin" } }); return; }
      setI(steps.length); // done
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  function reset() { setI(0); setPeriod(null); setFlow(null); setFeel(null); setMood(null); setSymptoms([]); setPain(null); setSys(""); setDia(""); setPul(""); setBpSymptom(null); setKicks(0); setKickStart(null); setNote(""); }

  if (!data) return <Screen><Glass><T>لحظة…</T></Glass></Screen>;
  if (i >= steps.length) {
    return (
      <Screen>
        <Glass style={{ alignItems: "center", gap: 10, paddingVertical: 28 }}>
          <T style={{ fontSize: 56, textAlign: "center" }}>💜</T>
          <T kind="h1" style={{ textAlign: "center" }}>خلصت، عاشت إيدچ</T>
          <T style={{ textAlign: "center" }} color={t.muted}>الدكتورة تشوف هذا بملفچ. {kicks >= 10 ? `الطفل يتحرك زين (10 حركات بـ ${Math.max(1, Math.round(((Date.now() - (kickStart ?? Date.now())) / 60000)))} دقيقة).` : ""}</T>
          <Button title="رجعي للرئيسية" onPress={() => { reset(); router.replace("/(tabs)"); }} />
          <Button title="غيّري شي" ghost onPress={reset} />
        </Glass>
      </Screen>
    );
  }

  const input = [s.input, { backgroundColor: t.glassStrong, borderColor: t.glassLine, color: t.fg }];
  const title: Record<Step, string> = { period: "اليوم عندچ دورة؟", flow: "كمية الدم شگد؟", feel: "شلونچ اليوم؟", symptoms: pregnant ? "شنو حاسة اليوم؟" : "شنو حاسة؟", bp: "قستي الضغط اليوم؟", kicks: "حركات الطفل", done: "" };
  const hint: Record<Step, string> = { period: "", flow: "", feel: "", symptoms: "اختاري كل اللي عندچ", bp: "اكتبي الأرقام مثل ما تطلع بالجهاز", kicks: "اضغطي الزر كل ما تحسين بحركة. نوقف عند 10.", done: "" };

  return (
    <>
      <Screen style={{ paddingBottom: 190 }}>
        <Steps step={i + 1} total={steps.length} />
        <Row><T kind="h1">{title[step]}</T><Listen text={`${title[step]}. ${hint[step]}`} /></Row>
        {!!hint[step] && <T kind="small">{hint[step]}</T>}

        {step === "period" && (
          <TileGrid cols={2}>
            <Tile emoji="🩸" label="ايه" on={period === true} onPress={() => setPeriod(true)} wide style={{ minHeight: 120 }} />
            <Tile emoji="🙂" label="لا" on={period === false} onPress={() => { setPeriod(false); setFlow(null); }} wide style={{ minHeight: 120 }} />
          </TileGrid>
        )}
        {step === "flow" && (
          <TileGrid cols={4}>{Object.entries(FLOW_PLAIN).map(([k, v]) => <Tile key={k} emoji={v.emoji.slice(0, 2)} label={v.label} on={flow === k} onPress={() => setFlow(k)} style={{ minHeight: 100 }} />)}</TileGrid>
        )}
        {step === "feel" && (
          <>
            <TileGrid cols={3}>{FEELINGS.map((f) => <Tile key={f.key} emoji={f.emoji} label={f.label} on={feel === f.key} onPress={() => setFeel(f.key)} style={{ ...tileWidth(3), minHeight: 110 }} />)}</TileGrid>
            {!!feel && (
              <Glass style={{ gap: 8 }}>
                <T kind="label">ومزاجچ؟ (اختياري)</T>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {MOODS_SIMPLE.map((m) => <Pressable key={m.key} onPress={() => setMood(mood === m.key ? null : m.key)} style={[s.chip, { backgroundColor: mood === m.key ? t.lav : t.glassStrong, borderColor: mood === m.key ? "transparent" : t.glassLine }]}><T kind="label" color={mood === m.key ? t.white : t.fg}>{m.emoji} {m.label}</T></Pressable>)}
                </View>
              </Glass>
            )}
          </>
        )}
        {step === "symptoms" && (
          <>
            {pregnant && <T kind="label" color={t.crit}>⚠️ علامات خطر: نخبر العيادة فوراً</T>}
            <TileGrid cols={4}>{list.filter((x) => x.danger).map((x) => <Tile key={x.key} emoji={x.emoji} label={x.label} danger on={symptoms.includes(x.key)} onPress={() => toggle(x.key)} />)}</TileGrid>
            {pregnant && <T kind="label" style={{ marginTop: 4 }}>أشياء عادية بالحمل</T>}
            <TileGrid cols={4}>{list.filter((x) => !x.danger).map((x) => <Tile key={x.key} emoji={x.emoji} label={x.label} on={symptoms.includes(x.key)} onPress={() => toggle(x.key)} />)}</TileGrid>
            {!pregnant && (
              <Glass style={{ gap: 8 }}>
                <T kind="label">عندچ وجع؟</T>
                <View style={{ flexDirection: "row", gap: 8 }}>{PAIN_LEVELS.map((p) => <Pressable key={p.key} onPress={() => setPain(p.key)} style={[s.pain, { backgroundColor: pain === p.key ? t.lav : t.glassStrong, borderColor: pain === p.key ? "transparent" : t.glassLine }]}><T style={{ fontSize: 22, textAlign: "center" }}>{p.emoji}</T><T kind="label" color={pain === p.key ? t.white : t.fg} style={{ textAlign: "center", fontSize: 12 }}>{p.label}</T></Pressable>)}</View>
              </Glass>
            )}
            <Glass style={{ gap: 6 }}>
              <T kind="label">تريدين تحچين للدكتورة؟ (اختياري)</T>
              <TextInput value={note} onChangeText={setNote} placeholder="اكتبي بكلمتين…" placeholderTextColor={t.faint} style={input} multiline maxLength={500} />
            </Glass>
          </>
        )}
        {step === "bp" && (
          <>
            <Glass style={{ gap: 10 }}>
              <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                <View style={[s.device, { backgroundColor: "#1e2a24" }]}>
                  <T kind="label" color="#9be7b0" style={{ textAlign: "left" }}>SYS <T kind="num" color="#e9fff0" style={{ fontSize: 22 }}>{sys || "---"}</T></T>
                  <T kind="label" color="#9be7b0" style={{ textAlign: "left" }}>DIA <T kind="num" color="#e9fff0" style={{ fontSize: 18 }}>{dia || "--"}</T></T>
                  <T kind="label" color="#9be7b0" style={{ textAlign: "left" }}>PUL <T kind="num" color="#e9fff0" style={{ fontSize: 16 }}>{pul || "--"}</T></T>
                </View>
                <View style={{ flex: 1, gap: 8 }}>
                  <Field label="الرقم الفوگاني (SYS)" v={sys} set={setSys} ph="120" t={t} />
                  <Field label="الرقم الجوّاني (DIA)" v={dia} set={setDia} ph="80" t={t} />
                  <Field label="النبض (PUL) اختياري" v={pul} set={setPul} ph="80" t={t} small />
                </View>
              </View>
              <View style={{ flexDirection: "row", gap: 6 }}>
                {(["ok", "high", "severe"] as const).map((k) => <View key={k} style={[s.lvl, { backgroundColor: level === k ? (k === "ok" ? t.okSoft : k === "high" ? t.warnSoft : t.critSoft) : t.glass, borderColor: level === k ? (k === "ok" ? t.ok : k === "high" ? t.warn : t.crit) : "transparent" }]}><T kind="label" style={{ textAlign: "center", fontSize: 12 }}>{k === "ok" ? "✓" : k === "high" ? "⚠️" : "🚨"} {BP_TEXT[k].word}</T><T kind="small" style={{ textAlign: "center", fontSize: 11 }}>{BP_TEXT[k].short}</T></View>)}
              </View>
            </Glass>
            {level && level !== "ok" && (
              <Glass style={{ backgroundColor: level === "severe" ? t.critSoft : t.warnSoft, borderColor: level === "severe" ? t.crit : t.warn, gap: 8 }}>
                <Row><T kind="title" color={t.fg}>{BP_TEXT[level].advice}</T><Listen text={BP_TEXT[level].advice} compact /></Row>
                <T color={t.fg}>هسه عندچ صداع قوي، زغللة بالعين، أو وجع فوق المعدة؟</T>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Button title="ايه، عندي" danger={bpSymptom === true} ghost={bpSymptom !== true} onPress={() => setBpSymptom(true)} style={{ flex: 1 }} />
                  <Button title="لا، ماكو" ghost={bpSymptom !== false} onPress={() => setBpSymptom(false)} style={{ flex: 1 }} />
                </View>
              </Glass>
            )}
            {!bpOk && <T kind="small">ما قستي اليوم؟ اضغطي «التالي» وبس.</T>}
          </>
        )}
        {step === "kicks" && (
          <Glass style={{ alignItems: "center", gap: 12, paddingVertical: 24 }}>
            <T kind="big" style={{ fontSize: 64, lineHeight: 70 }}>{kicks}</T>
            <T kind="small">{kickStart ? `مرّ ${Math.max(0, Math.round((Date.now() - kickStart) / 60000))} دقيقة` : "استلقي على جنبچ اليسار بعد الأكل"}</T>
            {kicks < 10 ? (
              <Pressable onPress={() => { if (!kickStart) setKickStart(Date.now()); setKicks(kicks + 1); }} style={[s.kick, { backgroundColor: t.lav }]} accessibilityLabel="حسّيت بحركة"><T kind="title" color={t.white} style={{ textAlign: "center", fontSize: 22 }}>👶 حسّيت بحركة</T></Pressable>
            ) : (
              <View style={[s.lvl, { backgroundColor: t.okSoft, alignSelf: "stretch" }]}><T kind="title" style={{ textAlign: "center" }}>زين، الطفل يتحرك 💜</T></View>
            )}
            {kickStart != null && kicks < 10 && Date.now() - kickStart > 2 * 3600_000 && <T kind="label" color={t.crit} style={{ textAlign: "center" }}>مرّت ساعتين وما وصلتي 10. اشربي شي بارد وأعيدي، وإذا بقت قليلة اضغطي الزر الأحمر.</T>}
            {!!tick && null}
          </Glass>
        )}
        {err && <Glass><T color={t.crit}>{err}</T></Glass>}
      </Screen>
      <DoneBar title={last ? "خلصت ✓" : "التالي"} onPress={next} busy={busy} disabled={!canNext} secondary={i > 0 ? "رجوع" : undefined} onSecondary={() => setI(Math.max(0, i - 1))} />
    </>
  );
}

function Field({ label, v, set, ph, t, small }: { label: string; v: string; set: (s: string) => void; ph: string; t: ReturnType<typeof useTheme>; small?: boolean }) {
  return (
    <View style={[s.field, { backgroundColor: t.glassStrong, borderColor: t.glassLine }]}>
      <T kind="label" style={{ flex: 1, fontSize: small ? 11 : 12 }}>{label}</T>
      <TextInput value={v} onChangeText={(x) => set(x.replace(/\D/g, "").slice(0, 3))} keyboardType="number-pad" placeholder={ph} placeholderTextColor={t.faint} style={[s.num, { color: t.fg, fontSize: small ? 18 : 24 }]} accessibilityLabel={label} />
    </View>
  );
}

const s = StyleSheet.create({
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, fontFamily: Fonts.regular, textAlign: "right", minHeight: 48 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1 },
  pain: { flex: 1, borderRadius: 16, borderWidth: 1, paddingVertical: 10, gap: 2, alignItems: "center" },
  device: { width: 92, borderRadius: 14, padding: 10, gap: 4 },
  field: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 4 },
  num: { width: 70, fontFamily: Fonts.semibold, textAlign: "center", paddingVertical: 6 },
  lvl: { flex: 1, borderRadius: 14, borderWidth: 1.5, padding: 8, gap: 2 },
  kick: { width: "100%", paddingVertical: 28, borderRadius: 24, alignItems: "center" },
});
