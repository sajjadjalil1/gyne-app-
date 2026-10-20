import { useEffect, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { DANGER_CYCLE, DANGER_PREGNANCY, type DangerSign } from "@gyne/core";
import { Background } from "@/components/background";
import { T } from "@/components/text";
import { Icon } from "@/components/icon";
import { Listen } from "@/components/listen";
import { Tile, TileGrid } from "@/components/tiles";
import { api } from "@/lib/api";
import { cachedHome } from "@/lib/use-home";
import { loadClinic, type ClinicInfo } from "@/lib/clinic-cache";
import { speak } from "@/lib/speak";
import { useTheme } from "@/hooks/use-theme";

/**
 * «عندي مشكلة هسه»: big pictures, read-aloud on by default, two big buttons.
 * Phone numbers and the hospital come from the on-device cache, so it works offline.
 */
export default function Emergency() {
  const t = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ signs?: string; from?: string }>();
  const [clinic, setClinic] = useState<ClinicInfo | null>(cachedHome() ? { ...cachedHome()!.clinic, mode: cachedHome()!.mode } : null);
  const [picked, setPicked] = useState<string[]>(params.signs ? params.signs.split(",").filter((x) => x !== "bp") : []);
  const [sent, setSent] = useState(false);
  useEffect(() => { if (!clinic) loadClinic().then(setClinic); }, [clinic]);
  const list: DangerSign[] = clinic?.mode === "pregnancy" || !clinic ? DANGER_PREGNANCY : DANGER_CYCLE;
  const chosen = list.filter((x) => picked.includes(x.key));
  const bpSevere = params.signs?.split(",").includes("bp");
  const er = bpSevere || chosen.some((x) => x.action === "ER");
  const headline = !picked.length ? "اختاري شنو صاير وياچ" : er ? "لا تنتظرين: روحي للطوارئ هسه" : "اتصلي بالعيادة هسه";
  useEffect(() => { speak(picked.length ? headline : "عندي مشكلة هسه. اختاري شنو صاير وياچ، وراح نگولچ شتسوين."); }, [headline, picked.length]);

  async function report(action: "ER" | "CALL") {
    if (!sent && (picked.length || bpSevere)) {
      try { await api("/api/danger", { method: "POST", json: { signs: [...picked, ...(bpSevere ? ["bp_severe"] : [])], action, source: params.from === "checkin" ? "checkin" : "button" } }); setSent(true); } catch {}
    }
  }
  async function goEr() { await report("ER"); if (clinic?.erMapsUrl) Linking.openURL(clinic.erMapsUrl); }
  async function call() { await report("CALL"); if (clinic?.phone) Linking.openURL(`tel:${clinic.phone}`); }

  return (
    <Background style={{ backgroundColor: "#fbe6ea" }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.content}>
          <View style={s.top}>
            <Pressable onPress={() => router.back()} style={[s.x, { backgroundColor: t.glassStrong }]} accessibilityLabel="إغلاق"><Icon name="x" size={20} color={t.fg} /></Pressable>
            <Listen text={headline} label="اسمعي · شغّال" />
          </View>
          <T kind="h1" color={t.crit} style={{ fontSize: 28 }}>عندي مشكلة هسه</T>
          <T color={t.muted}>اختاري شنو صاير وياچ</T>
          <TileGrid cols={2}>{list.map((x) => <Tile key={x.key} emoji={x.emoji} label={x.label} wide danger on={picked.includes(x.key)} onPress={() => setPicked((p) => (p.includes(x.key) ? p.filter((k) => k !== x.key) : [...p, x.key]))} style={{ minHeight: 76 }} />)}</TileGrid>

          <View style={[s.card, { backgroundColor: "rgba(255,255,255,0.75)", borderColor: er ? t.crit : t.glassLine }]}>
            <T kind="title" color={er ? t.crit : t.fg}>{headline}</T>
            {bpSevere && <T kind="small">ضغطچ 160/110 أو أكثر: هذا يحتاج مستشفى، مو انتظار.</T>}
            {!picked.length && !bpSevere && <T kind="small">إذا مو متأكدة، اتصلي بالعيادة وهم يگولولچ.</T>}
            <Pressable onPress={goEr} style={[s.big, { backgroundColor: t.crit }]} accessibilityRole="button"><T kind="title" color={t.white} style={{ textAlign: "center", fontSize: 19 }}>🏥 روحي للطوارئ هسه</T></Pressable>
            {clinic?.erHospital && <T kind="small" style={{ textAlign: "center" }}>أقرب مستشفى ولادة: {clinic.erHospital}{clinic.erMapsUrl ? " · اضغطي للخريطة" : ""}</T>}
            <Pressable onPress={call} disabled={!clinic?.phone} style={[s.big, { backgroundColor: t.glassStrong, borderWidth: 1, borderColor: t.glassLine, opacity: clinic?.phone ? 1 : 0.6 }]} accessibilityRole="button"><T kind="title" style={{ textAlign: "center", fontSize: 19 }}>📞 اتصلي بالعيادة هسه</T></Pressable>
            {!clinic?.phone && <T kind="small" style={{ textAlign: "center" }}>رقم العيادة يظهر هنا بعد أول دخول بالإنترنت.</T>}
            <View style={{ flexDirection: "row", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
              <T kind="small" color={sent ? t.ok : t.muted}>{sent ? "✓ الدكتورة وصلها تنبيه" : "لما تضغطين زر، الدكتورة يوصلها تنبيه"}</T>
              <T kind="small">· يشتغل بدون إنترنت</T>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Background>
  );
}
const s = StyleSheet.create({
  content: { padding: 20, gap: 12, maxWidth: 520, width: "100%", alignSelf: "center" },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  x: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  card: { borderRadius: 24, borderWidth: 1.5, padding: 16, gap: 10 },
  big: { paddingVertical: 18, borderRadius: 999, alignItems: "center" },
});
